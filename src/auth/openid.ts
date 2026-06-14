import * as oauth from "oauth4webapi";
import type { TransportOptions } from "../transport-options.js";
import { DefaultApiClient } from "../default-api-client.js";

/**
 * OpenId class is responsible for fetching and storing important OpenID
 * configuration endpoints. It interacts with the OpenID provider's
 * well-known configuration endpoint and retrieves the token, authorization,
 * and userinfo endpoints.
 */
export class OpenId {
  /**
   * @param authServer The discovered authorization server metadata.
   * @param hostEndpoint The normalized hostname originally supplied to
   *   {@link OpenId.discover}, retained so the host can be reported back to
   *   callers without leaking the (possibly path-bearing) discovered issuer.
   */
  private constructor(
    private readonly authServer: oauth.AuthorizationServer,
    private readonly hostEndpoint: string,
  ) {}

  /**
   * Builds and returns a URL object from the provided hostname.
   * If the hostname does not include a scheme, it defaults to "https".
   */
  private static buildHostname(hostname: string): URL {
    if (!hostname.startsWith("http")) {
      return new URL(`https://${hostname}`);
    }
    return new URL(hostname);
  }

  /**
   * Builds the URL to the well-known OpenID configuration endpoint.
   */
  private static buildWellKnownUrl(hostname: string): string {
    const url = this.buildHostname(hostname);
    url.pathname = "/.well-known/openid-configuration";
    return url.toString();
  }

  /**
   * Fetches the OpenID configuration from the well-known endpoint.
   */
  private static async fetchOpenIdConfiguration(
    hostname: string,
    transportOptions?: TransportOptions,
  ): Promise<oauth.AuthorizationServer> {
    const wellKnownUrl = this.buildWellKnownUrl(hostname);

    const fetchInit: Record<string, unknown> = {};
    if (transportOptions?.defaultHeaders) {
      fetchInit.headers = transportOptions.defaultHeaders;
    }

    /* Apply the same TLS (custom CA / verifySsl) and proxy configuration used
     * by regular API requests so that discovery against a self-signed or
     * proxied issuer succeeds instead of failing the TLS handshake. */
    if (transportOptions) {
      const dispatcher = DefaultApiClient.buildDispatcher(transportOptions);
      if (dispatcher) {
        fetchInit.dispatcher = dispatcher;
      }
    }

    const response = await fetch(
      wellKnownUrl,
      fetchInit as Parameters<typeof fetch>[1],
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch OpenID configuration: ${response.status} ${response.statusText}`,
      );
    }

    try {
      // Assign the JSON response to the specified type.
      return (await response.json()) as unknown as oauth.AuthorizationServer;
    } catch {
      throw new Error("Failed to parse OpenID configuration JSON.");
    }
  }

  /**
   * Discovers the OpenID configuration from a provider's hostname.
   *
   * This method accepts a hostname, fetches the OpenID configuration,
   * and returns a new OpenId instance.
   *
   * @param hostname The hostname of the OpenID provider.
   * @param transportOptions Optional transport options for TLS, proxy, and headers.
   * @returns A promise that resolves to an OpenId instance.
   * @throws {Error} If the provided hostname is empty, or if there's an
   * error during the HTTP request or JSON parsing.
   */
  public static async discover(
    hostname: string,
    transportOptions?: TransportOptions,
  ): Promise<OpenId> {
    if (!hostname) {
      throw new Error("Hostname cannot be empty.");
    }

    const authServer = await this.fetchOpenIdConfiguration(
      hostname,
      transportOptions,
    );
    return new OpenId(authServer, this.buildHostname(hostname).toString());
  }

  /**
   * Returns the discovered Authorization Server metadata.
   */
  getAuthorizationServer(): oauth.AuthorizationServer {
    return this.authServer;
  }

  /**
   * Returns the normalized host endpoint originally supplied to discovery.
   *
   * This is the caller-facing API host, not the discovered issuer (which may
   * carry a path such as `/.well-known/openid-configuration` for some
   * providers).
   *
   * @returns The normalized host endpoint URL.
   */
  public getHostEndpoint(): string {
    return this.hostEndpoint;
  }

  /**
   * Returns the token endpoint URL.
   *
   * @returns The token endpoint URL.
   */
  public getTokenEndpoint(): string {
    if (!this.authServer.token_endpoint) {
      throw new Error("Token endpoint not found in OpenID configuration.");
    }
    return this.authServer.token_endpoint;
  }

  /**
   * Returns the authorization endpoint URL.
   *
   * @returns The authorization endpoint URL.
   */
  public getAuthorizationEndpoint(): string {
    if (!this.authServer.authorization_endpoint) {
      throw new Error(
        "Authorization endpoint not found in OpenID configuration.",
      );
    }
    return this.authServer.authorization_endpoint;
  }

  /**
   * Returns the userinfo endpoint URL.
   *
   * @returns The userinfo endpoint URL.
   */
  public getUserinfoEndpoint(): string {
    if (!this.authServer.userinfo_endpoint) {
      throw new Error("Userinfo endpoint not found in OpenID configuration.");
    }
    return this.authServer.userinfo_endpoint;
  }
}
