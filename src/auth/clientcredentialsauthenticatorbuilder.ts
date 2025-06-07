import { OAuthAuthenticatorBuilder } from './oauthauthenticatorbuilder.js';
import { ClientCredentialsAuthenticator } from './clientcredentialsauthenticator.js';

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
   */
  public constructor(
    host: string,
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {
    super(host);
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
    );
  }
}
