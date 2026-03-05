import * as oauth from 'oauth4webapi';
import { TransportOptions, buildDispatcher } from '../transport-options.js';

/**
 * OpenId class is responsible for fetching and storing important OpenID
 * configuration endpoints. It interacts with the OpenID provider's
 * well-known configuration endpoint and retrieves the token, authorization,
 * and userinfo endpoints.
 */
export class OpenId {
  /**
   * @param authServer The discovered authorization server metadata.
   */
  private constructor(private readonly authServer: oauth.AuthorizationServer) {}

  /**
   * Builds and returns a URL object from the provided hostname.
   * If the hostname does not include a scheme, it defaults to "https".
   */
  private static buildHostname(hostname: string): URL {
    if (!hostname.startsWith('http')) {
      return new URL(`https://${hostname}`);
    }
    return new URL(hostname);
  }

  /**
   * Builds the URL to the well-known OpenID configuration endpoint.
   */
  private static buildWellKnownUrl(hostname: string): string {
    const url = this.buildHostname(hostname);
    url.pathname = '/.well-known/openid-configuration';
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
    const dispatcher = await buildDispatcher(transportOptions);
    if (dispatcher) {
      fetchInit.dispatcher = dispatcher;
    }

    // eslint-disable-next-line no-undef
    const response = await fetch(wellKnownUrl, fetchInit as RequestInit);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch OpenID configuration: ${response.status} ${response.statusText}`,
      );
    }

    try {
      // Assign the JSON response to the specified type.
      return (await response.json()) as unknown as oauth.AuthorizationServer;
    } catch {
      throw new Error('Failed to parse OpenID configuration JSON.');
    }
  }

  /**
   * Discovers the OpenID configuration from a provider's hostname.
   *
   * This method accepts a hostname, fetches the OpenID configuration,
   * and returns a new OpenId instance.
   *
   * @param hostname The hostname of the OpenID provider.
   * @returns A promise that resolves to an OpenId instance.
   * @throws {Error} If the provided hostname is empty, or if there's an
   * error during the HTTP request or JSON parsing.
   */
  public static async discover(
    hostname: string,
    transportOptions?: TransportOptions,
  ): Promise<OpenId> {
    if (!hostname) {
      throw new Error('Hostname cannot be empty.');
    }

    const authServer = await this.fetchOpenIdConfiguration(
      hostname,
      transportOptions,
    );
    return new OpenId(authServer);
  }

  /**
   * Returns the discovered Authorization Server metadata.
   */
  getAuthorizationServer(): oauth.AuthorizationServer {
    return this.authServer;
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Returns the token endpoint URL.
   *
   * This method returns the URL for obtaining OpenID tokens.
   *
   * @returns The token endpoint URL.
   */
  public getTokenEndpoint(): string {
    if (!this.authServer.token_endpoint) {
      throw new Error('Token endpoint not found in OpenID configuration.');
    }
    return this.authServer.token_endpoint;
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Returns the authorization endpoint URL.
   *
   * This method returns the URL used for authorization requests.
   *
   * @returns The authorization endpoint URL.
   */
  public getAuthorizationEndpoint(): string {
    if (!this.authServer.authorization_endpoint) {
      throw new Error(
        'Authorization endpoint not found in OpenID configuration.',
      );
    }
    return this.authServer.authorization_endpoint;
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Returns the userinfo endpoint URL.
   *
   * This method returns the URL for fetching user information from the
   * OpenID provider.
   *
   * @returns The userinfo endpoint URL.
   */
  public getUserinfoEndpoint(): string {
    if (!this.authServer.userinfo_endpoint) {
      throw new Error('Userinfo endpoint not found in OpenID configuration.');
    }
    return this.authServer.userinfo_endpoint;
  }
}
