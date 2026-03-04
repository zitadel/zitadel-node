import { OAuthAuthenticatorBuilder } from './oauth-authenticator-builder.js';
import { ClientCredentialsAuthenticator } from './client-credentials-authenticator.js';
import { TransportOptions } from '../transport-options.js';

/**
 * Builder for ClientCredentialsAuthenticator.
 *
 * Extends the base OAuthAuthenticatorBuilder to provide a fluent API for
 * constructing a ClientCredentialsAuthenticator instance.
 */
export class ClientCredentialsAuthenticatorBuilder extends OAuthAuthenticatorBuilder {
  /**
   * Constructs the builder with the required parameters.
   *
   * @param host The base URL for API endpoints.
   * @param clientId The OAuth2 client identifier.
   * @param clientSecret The OAuth2 client secret.
   * @param transportOptions Optional transport options for TLS and headers.
   */
  public constructor(
    host: string,
    private readonly clientId: string,
    private readonly clientSecret: string,
    transportOptions?: TransportOptions,
  ) {
    super(host, transportOptions);
  }

  /**
   * Builds and returns a new ClientCredentialsAuthenticator instance.
   *
   * @returns The constructed ClientCredentialsAuthenticator.
   */
  public async build(): Promise<ClientCredentialsAuthenticator> {
    await this.discoverOpenId();
    return new ClientCredentialsAuthenticator(
      this.openId,
      this.clientId,
      this.clientSecret,
      this.authScopes,
      this.transportOptions,
    );
  }
}
