import { BaseAuthenticator } from "./base-authenticator.js";
import type { HttpAwareAuthenticator } from "./http-aware-authenticator.js";
import type { ApiClient } from "../api-client.js";
import { OpenId } from "./open-id.js";
import { OAuth2ServerError } from "../errors/oauth2-server-error.js";
import { OAuth2TokenError } from "../errors/oauth2-token-error.js";

/** Seconds before expiry at which a cached token is treated as stale. */
const REFRESH_SKEW_SECONDS = 300;

function parseObject(body: string): Record<string, unknown> | null {
  try {
    const payload: unknown = JSON.parse(body);
    return payload !== null &&
      typeof payload === "object" &&
      !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * Throws a {@link TypeError} when the value is not a non-blank string.
 *
 * @param value the value to check
 * @param label the name used in the error message
 * @returns the value
 */
export function requireText(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${label} cannot be empty.`);
  }
  return value;
}

/**
 * Abstract base class for OAuth-based, token-minting authenticators.
 *
 * Mints a bearer token by POSTing an OAuth2 grant (client-credentials or a
 * signed JWT-bearer assertion) to the provider's token endpoint, then attaches
 * the resulting access token on every API request. The minted token is cached
 * together with its expiry and only re-minted once it is within the refresh
 * skew of expiring.
 *
 * Token-minting requires an outbound HTTP call, so this class implements
 * {@link HttpAwareAuthenticator}: the shared {@link ApiClient} is injected by
 * the `Zitadel` constructor and both OpenID discovery and the token POST are
 * sent through it. A token request fails with:
 *
 * - `Error` when no {@link ApiClient} has been injected;
 * - `NetworkError` or `NetworkTimeoutError` when no HTTP response arrived;
 * - {@link OAuth2ServerError} when the token endpoint answered with a non-2xx
 *   status;
 * - {@link OAuth2TokenError} when it answered 2xx without a usable access
 *   token.
 */
export abstract class OAuthAuthenticator
  extends BaseAuthenticator
  implements HttpAwareAuthenticator
{
  private apiClient: ApiClient | null = null;
  private accessToken: string | null = null;
  private expiresAt: number | null = null;
  private pending: Promise<string> | null = null;

  /**
   * @param openId the OpenID discovery helper for the target host
   * @param scope the space-delimited scope string for the token request
   */
  protected constructor(
    private readonly openId: OpenId,
    protected readonly scope: string,
  ) {
    super();
  }

  public setApiClient(apiClient: ApiClient): void {
    this.apiClient = apiClient;
  }

  public getHost(): string {
    return this.openId.getHostEndpoint();
  }

  /**
   * Returns the Authorization header for the cached token, or no header when
   * no token has been minted yet. Use {@link getAuthHeadersAsync} to mint one.
   */
  public getAuthHeaders(): Record<string, string> {
    return this.accessToken === null
      ? {}
      : { Authorization: `Bearer ${this.accessToken}` };
  }

  /**
   * Returns the Authorization header, minting a token first when needed.
   */
  public override async getAuthHeadersAsync(): Promise<Record<string, string>> {
    return { Authorization: `Bearer ${await this.getAuthToken()}` };
  }

  /**
   * Returns a valid access token, minting (or re-minting) one if the cache is
   * empty or within the refresh skew of expiring.
   */
  public async getAuthToken(): Promise<string> {
    if (this.accessToken === null || this.isStale()) {
      return this.refreshToken();
    }
    return this.accessToken;
  }

  private isStale(): boolean {
    return (
      this.expiresAt !== null &&
      Date.now() >= this.expiresAt - REFRESH_SKEW_SECONDS * 1000
    );
  }

  /**
   * Exchanges the configured grant for a fresh access token and caches it.
   * Concurrent calls share one token request.
   *
   * @returns the freshly minted access token
   */
  public refreshToken(): Promise<string> {
    if (this.pending === null) {
      this.pending = this.mintToken().finally(() => {
        this.pending = null;
      });
    }
    return this.pending;
  }

  private async mintToken(): Promise<string> {
    const apiClient = this.apiClient;
    if (apiClient === null) {
      throw new Error(
        "OAuthAuthenticator has no ApiClient; use it through the Zitadel client, which injects one before the first token request.",
      );
    }

    const params = new URLSearchParams({
      grant_type: this.getGrantType(),
      scope: this.scope,
      ...(await this.getTokenRequestParams()),
    });

    const response = await apiClient.sendRequest(
      "POST",
      await this.openId.getTokenEndpoint(apiClient),
      {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      params.toString(),
      /* never replay a token POST across a redirect: a malicious 307/308
       * could otherwise leak the assertion or secret. */
      { noRedirect: true },
    );

    const status = response.statusCode;
    if (status < 200 || status >= 300) {
      throw OAuthAuthenticator.serverError(status, response.body);
    }

    const payload = parseObject(response.body);
    if (payload === null) {
      throw new OAuth2TokenError("Token response is not a JSON object");
    }
    const accessToken = payload.access_token;
    if (typeof accessToken !== "string" || accessToken === "") {
      throw new OAuth2TokenError(
        "Token response missing or empty access_token field",
      );
    }
    const expiresIn = payload.expires_in;
    this.expiresAt =
      typeof expiresIn === "number" && expiresIn > 0
        ? Date.now() + expiresIn * 1000
        : null;
    this.accessToken = accessToken;
    return accessToken;
  }

  private static serverError(status: number, body: string): OAuth2ServerError {
    const payload = parseObject(body);
    const code = payload?.error;
    if (payload === null || typeof code !== "string" || code === "") {
      return new OAuth2ServerError(status, null, null, null, body);
    }
    const description = payload.error_description;
    const uri = payload.error_uri;
    return new OAuth2ServerError(
      status,
      code,
      typeof description === "string" ? description : null,
      typeof uri === "string" ? uri : null,
      body,
    );
  }

  /**
   * Returns `***` when a token is cached and null otherwise.
   */
  protected maskedToken(): string | null {
    return this.accessToken === null ? null : "***";
  }

  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return `${this.constructor.name}(host=${this.getHost()}, scope=${this.scope}, accessToken=${this.maskedToken()})`;
  }

  toJSON(): Record<string, unknown> {
    return {
      host: this.getHost(),
      scope: this.scope,
      accessToken: this.maskedToken(),
    };
  }

  /**
   * The OAuth2 `grant_type` value sent in the token request.
   */
  protected abstract getGrantType(): string;

  /**
   * Grant-specific token-request parameters (e.g. assertion).
   */
  protected abstract getTokenRequestParams():
    | Record<string, string>
    | Promise<Record<string, string>>;
}
