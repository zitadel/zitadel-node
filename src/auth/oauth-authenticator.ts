import { BaseAuthenticator } from "./base-authenticator.js";
import type { HttpAwareAuthenticator } from "./http-aware-authenticator.js";
import type { ApiClient } from "../api-client.js";
import * as oauth from "oauth4webapi";
import { ApiError } from "../api-error.js";
import type { TransportOptions } from "../transport-options.js";
import { DefaultApiClient } from "../default-api-client.js";

/**
 * Abstract base class for OAuth-based authenticators.
 *
 * Provides common functionality for OAuth authenticators, including token
 * management and header construction. The {@link Authenticator} contract
 * exposes a synchronous {@link getAuthHeaders}, so the access token must be
 * minted (or refreshed) out-of-band via {@link prime} before any request; the
 * `Zitadel` facade wraps every API method to call {@link prime} first.
 */
export abstract class OAuthAuthenticator
  extends BaseAuthenticator
  implements HttpAwareAuthenticator
{
  /**
   * The OAuth2 token.
   */
  protected token: oauth.TokenEndpointResponse | null = null;
  /**
   * The token's expiration timestamp.
   */
  protected tokenExpiry: number | null = null;
  /**
   * The shared API client injected via {@link setApiClient}, if any. Retained
   * so transport configuration (proxy/TLS/timeouts) can be honoured by any
   * future HTTP performed outside oauth4webapi's own fetch pipeline.
   */
  protected apiClient: ApiClient | null = null;

  /**
   * OAuthAuthenticator constructor.
   *
   * @param hostEndpoint The normalized API host originally supplied to OpenID
   *   discovery, reported back via {@link getHost}.
   * @param authServer The discovered authorization server metadata.
   * @param client The OAuth2 client metadata.
   * @param scope The scope for the token request.
   * @param transportOptions Optional transport options for TLS, proxy, and headers.
   */
  protected constructor(
    protected readonly hostEndpoint: string,
    protected readonly authServer: oauth.AuthorizationServer,
    protected readonly client: oauth.Client,
    protected readonly scope: string,
    protected readonly transportOptions?: TransportOptions,
  ) {
    super();
  }

  /**
   * Inject the shared API client. OAuth token exchange is performed via
   * oauth4webapi's own fetch pipeline, so the client is accepted for
   * interface conformance but not required.
   */
  public setApiClient(apiClient: ApiClient): void {
    // Token exchange itself uses oauth4webapi's customFetch wrapper; the
    // client is retained for interface conformance and future reuse.
    this.apiClient = apiClient;
  }

  /**
   * The API host. OAuth authenticators report the normalized hostname that
   * was supplied to OpenID discovery, not the discovered issuer (which may
   * carry a path for some providers).
   */
  public getHost(): string {
    return this.hostEndpoint;
  }

  /**
   * Synchronous auth headers. Requires {@link prime} to have minted a token
   * first (the `Zitadel` facade guarantees this before each API call).
   */
  public getAuthHeaders(): Record<string, string> {
    const accessToken = this.token?.access_token;
    if (!accessToken) {
      return {};
    }
    return { Authorization: `Bearer ${accessToken}` };
  }

  /**
   * Ensure a valid access token is available, refreshing it when missing or
   * expired. Called before each API request by the SDK facade.
   */
  public async prime(): Promise<void> {
    await this.getAuthToken();
  }

  /**
   * Builds oauth4webapi request options from transport options.
   *
   * Constructs a customFetch wrapper that applies the configured default
   * headers to all HTTP requests made by oauth4webapi functions.
   *
   * @returns An options object suitable for passing to oauth4webapi token
   *          request functions.
   */
  protected buildTokenRequestOptions(): Record<string | symbol, unknown> {
    const options: Record<string | symbol, unknown> = {};

    if (this.authServer.issuer.startsWith("http://")) {
      options[oauth.allowInsecureRequests] = true;
    }

    const defaultHeaders = this.transportOptions?.defaultHeaders;
    /* Build an undici dispatcher so the token exchange honours the same TLS
     * (custom CA / verifySsl) and proxy configuration as regular API
     * requests. oauth4webapi performs its own fetch, so without this a
     * self-signed or proxied token endpoint would fail the handshake. */
    const dispatcher = this.transportOptions
      ? DefaultApiClient.buildDispatcher(this.transportOptions)
      : undefined;

    if (defaultHeaders) {
      options.headers = defaultHeaders;
    }

    if (defaultHeaders || dispatcher) {
      options[oauth.customFetch] = (
        url: string,
        fetchOptions: Record<string, unknown>,
      ) => {
        if (defaultHeaders) {
          const existingHeaders = (fetchOptions.headers ?? {}) as Record<
            string,
            string
          >;
          fetchOptions.headers = { ...defaultHeaders, ...existingHeaders };
        }
        if (dispatcher) {
          fetchOptions.dispatcher = dispatcher;
        }
        return fetch(url, fetchOptions as Parameters<typeof fetch>[1]);
      };
    }

    return options;
  }

  /**
   * Retrieve the access token using the OAuth2 flow, refreshing when needed.
   *
   * @returns The access token.
   * @throws {Error} if token retrieval fails.
   */
  public async getAuthToken(): Promise<string> {
    if (!this.token || !this.tokenExpiry || Date.now() >= this.tokenExpiry) {
      await this.refreshToken();
    }

    if (!this.token?.access_token) {
      throw new Error("Failed to retrieve a valid access token.");
    }

    return this.token.access_token;
  }

  /**
   * Refresh the access token using the configured grant type and options.
   *
   * @returns The refreshed access token response.
   * @throws {ApiError} if token fetch fails or response is invalid. (ApiError
   *   is re-exported as the SDK's `ZitadelException`, so token-exchange
   *   failures and API-response errors share a single error base.)
   */
  public async refreshToken(): Promise<oauth.TokenEndpointResponse> {
    try {
      this.token = await this.performTokenRequest(this.authServer, this.client);
      const expiresIn = this.token.expires_in ?? 3600;
      const buffer = 30 * 1000;
      this.tokenExpiry = Date.now() + expiresIn * 1000 - buffer;

      return this.token;
    } catch (err) {
      throw new ApiError(0, "Token refresh failed", null, null, null, {
        cause: err,
      });
    }
  }

  protected abstract performTokenRequest(
    authServer: oauth.AuthorizationServer,
    client: oauth.Client,
  ): Promise<oauth.TokenEndpointResponse>;
}
