import { Authenticator } from './authenticator.js';
import * as oauth from 'oauth4webapi';

/**
 * Abstract base class for OAuth-based authenticators.
 *
 * Provides common functionality for OAuth authenticators, including token
 * management and header construction.
 */
export abstract class OAuthAuthenticator extends Authenticator {
  /**
   * The OAuth2 token.
   */
  protected token: oauth.TokenEndpointResponse | null = null;
  /**
   * The token's expiration timestamp.
   */
  protected tokenExpiry: number | null = null;

  /**
   * OAuthAuthenticator constructor.
   *
   * @param authServer The discovered authorization server metadata.
   * @param client The OAuth2 client metadata.
   * @param scope The scope for the token request.
   */
  protected constructor(
    protected readonly authServer: oauth.AuthorizationServer,
    protected readonly client: oauth.Client,
    protected readonly scope: string,
  ) {
    super(authServer.issuer);
  }

  /**
   * Retrieve the authentication token using the OAuth2 flow.
   *
   * This method checks if a valid token is available and refreshes it if
   * necessary.
   *
   * @returns The authentication token.
   * @throws {Error} if token retrieval fails.
   */
  public async getAuthToken(): Promise<string> {
    if (!this.token || !this.tokenExpiry || Date.now() >= this.tokenExpiry) {
      await this.refreshToken();
    }

    if (!this.token?.access_token) {
      throw new Error('Failed to retrieve a valid access token.');
    }

    return this.token.access_token;
  }

  /**
   * Refresh the access token using the configured grant type and options.
   *
   * @returns The refreshed access token response.
   * @throws {Error} if token fetch fails or response is invalid.
   */
  public async refreshToken(): Promise<oauth.TokenEndpointResponse> {
    try {
      this.token = await this.performTokenRequest(this.authServer, this.client);
      const expiresIn = this.token.expires_in ?? 3600;
      const buffer = 30 * 1000;
      this.tokenExpiry = Date.now() + expiresIn * 1000 - buffer;

      return this.token;
    } catch (err) {
      this.token = null;
      this.tokenExpiry = null;
      throw err;
    }
  }

  protected abstract performTokenRequest(
    authServer: oauth.AuthorizationServer,
    client: oauth.Client,
  ): Promise<oauth.TokenEndpointResponse>;
}
