import * as oauth from 'oauth4webapi';

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
   * Constructor to initialize the OpenId instance and fetch OpenID
   * configuration.
   *
   * This constructor accepts a hostname, fetches the OpenID configuration,
   * and stores the `token_endpoint`, `authorization_endpoint`, and
   * `userinfo_endpoint` for future use.
   *
   * @param hostname The hostname of the OpenID provider.
   * @returns A promise that resolves to an OpenId instance.
   * @throws {Error} If the provided hostname is empty, or if there's an
   * error during the HTTP request or JSON parsing.
   */
  public static async discover(hostname: string): Promise<OpenId> {
    if (!hostname) {
      throw new Error('Hostname cannot be empty.');
    }
    if (!hostname.startsWith('http')) {
      hostname = `https://${hostname}`;
    }
    const issuer = new URL(hostname);
    const authServer = await oauth
      .discoveryRequest(issuer)
      .then((response) => oauth.processDiscoveryResponse(issuer, response));
    return new OpenId(authServer);
  }

  /**
   * Returns the discovered Authorization Server metadata.
   */
  public getAuthorizationServer(): oauth.AuthorizationServer {
    return this.authServer;
  }

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
