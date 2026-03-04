import { Authenticator } from './authenticator.js';
import * as oauth from 'oauth4webapi';
import { ZitadelException } from '../zitadel-exception.js';
import { TransportOptions, buildDispatcher } from '../configuration.js';

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
   * Cached dispatcher for reuse across token requests.
   */
  private cachedDispatcher: Promise<unknown | undefined> | null = null;

  /**
   * OAuthAuthenticator constructor.
   *
   * @param authServer The discovered authorization server metadata.
   * @param client The OAuth2 client metadata.
   * @param scope The scope for the token request.
   * @param transportOptions Optional transport options for TLS, proxy, and headers.
   */
  protected constructor(
    protected readonly authServer: oauth.AuthorizationServer,
    protected readonly client: oauth.Client,
    protected readonly scope: string,
    protected readonly transportOptions?: TransportOptions,
  ) {
    super(authServer.issuer);
  }

  /**
   * Builds oauth4webapi request options from transport options.
   *
   * Constructs a customFetch wrapper that applies the configured dispatcher
   * (for TLS/proxy settings) and default headers to all HTTP requests made
   * by oauth4webapi functions.
   *
   * @returns An options object suitable for passing to oauth4webapi token
   *          request functions.
   */
  protected async buildTokenRequestOptions(): Promise<
    Record<string | symbol, unknown>
  > {
    const options: Record<string | symbol, unknown> = {};

    if (this.transportOptions?.insecure) {
      options[oauth.allowInsecureRequests] = true;
    }

    if (this.transportOptions?.defaultHeaders) {
      options.headers = this.transportOptions.defaultHeaders;
    }

    if (this.cachedDispatcher === null) {
      this.cachedDispatcher = buildDispatcher(this.transportOptions);
    }
    const dispatcher = await this.cachedDispatcher;
    if (dispatcher || this.transportOptions?.defaultHeaders) {
      const defaultHeaders = this.transportOptions?.defaultHeaders;
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
        return fetch(url, {
          ...fetchOptions,
          ...(dispatcher ? { dispatcher } : {}),
        } as RequestInit);
      };
    }

    return options;
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
      throw new ZitadelException('Token refresh failed: ', err);
    }
  }

  protected abstract performTokenRequest(
    authServer: oauth.AuthorizationServer,
    client: oauth.Client,
  ): Promise<oauth.TokenEndpointResponse>;
}
