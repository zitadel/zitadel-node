import type { ApiClient } from "../api-client.js";
import { ApiError } from "../errors/api-error.js";
import { SerializationError } from "../errors/serialization-error.js";

const WELL_KNOWN_PATH = "/.well-known/openid-configuration";

/**
 * Resolves the OpenID Connect discovery document for a Zitadel host.
 *
 * The constructor only validates and normalises the host; it performs no I/O.
 * The `token_endpoint` is fetched through the shared {@link ApiClient} the
 * first time {@link OpenId.getTokenEndpoint} is called, so discovery honours
 * the SDK's proxy, TLS and timeout settings and fails with the same error
 * types as any other request:
 *
 * - no HTTP response: `NetworkError` or `NetworkTimeoutError`;
 * - a non-2xx status: the {@link ApiError} subclass for that status;
 * - a body that is not a JSON object with a `token_endpoint`:
 *   {@link SerializationError}.
 */
export class OpenId {
  private readonly hostEndpoint: string;
  private readonly wellKnownUrl: string;
  private tokenEndpoint: Promise<string> | null = null;

  /**
   * Validates and normalises the host. A host without a scheme gets `https://`.
   *
   * @param host the Zitadel instance host name or URL
   * @throws {TypeError} if the host is empty, uses a scheme other than http or
   *   https, or is not a valid URL
   */
  public constructor(host: string) {
    this.hostEndpoint = OpenId.normaliseHost(host);
    this.wellKnownUrl = new URL(WELL_KNOWN_PATH, this.hostEndpoint).toString();
  }

  private static normaliseHost(host: string): string {
    let trimmed = (host ?? "").trim();
    if (trimmed === "") {
      throw new TypeError("Host cannot be empty.");
    }
    const lower = trimmed.toLowerCase();
    if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
      if (trimmed.includes("://")) {
        throw new TypeError(
          `Host must use the http or https scheme: ${trimmed}`,
        );
      }
      trimmed = `https://${trimmed}`;
    }
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch (e) {
      throw new TypeError(`Host is not a valid URL: ${trimmed}`, { cause: e });
    }
    if (parsed.hostname === "") {
      throw new TypeError(`Host is not a valid URL: ${trimmed}`);
    }
    return trimmed;
  }

  /**
   * Returns the normalised host endpoint.
   */
  public getHostEndpoint(): string {
    return this.hostEndpoint;
  }

  /**
   * Returns the OAuth2 token endpoint, fetching the discovery document through
   * the given API client on first access and caching the result.
   *
   * @param apiClient the shared API client used for the discovery request
   * @throws {ApiError} if discovery fails at the transport or HTTP level
   * @throws {SerializationError} if the discovery document is unusable
   */
  public getTokenEndpoint(apiClient: ApiClient): Promise<string> {
    if (this.tokenEndpoint === null) {
      const pending = this.discover(apiClient);
      this.tokenEndpoint = pending;
      pending.catch(() => {
        this.tokenEndpoint = null;
      });
    }
    return this.tokenEndpoint;
  }

  private async discover(apiClient: ApiClient): Promise<string> {
    const url = this.wellKnownUrl;
    const response = await apiClient.sendRequest(
      "GET",
      url,
      { Accept: "application/json" },
      null,
    );
    const status = response.statusCode;
    if (status < 200 || status >= 300) {
      throw ApiError.fromResponse(
        status,
        { ...response.headers },
        response.body,
      );
    }
    let document: unknown;
    try {
      document = JSON.parse(response.body);
    } catch (e) {
      throw new SerializationError(
        `OpenID configuration at ${url} is not a JSON object`,
        e as Error,
      );
    }
    if (
      document === null ||
      typeof document !== "object" ||
      Array.isArray(document)
    ) {
      throw new SerializationError(
        `OpenID configuration at ${url} is not a JSON object`,
      );
    }
    const endpoint = (document as Record<string, unknown>).token_endpoint;
    if (typeof endpoint !== "string" || endpoint === "") {
      throw new SerializationError(
        `OpenID configuration at ${url} has no valid token_endpoint`,
      );
    }
    return endpoint;
  }
}
