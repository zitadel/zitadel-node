<<<<<<< Updated upstream
import { OAuthAuthenticatorBuilder } from './oauth-authenticator-builder.js';
import { ClientCredentialsAuthenticator } from './client-credentials-authenticator.js';
||||||| Stash base
// file: src/auth/clientcredentialsauthenticatorbuilder.ts
import { OAuthAuthenticatorBuilder } from './oauthauthenticatorbuilder.js';
import { ClientCredentialsAuthenticator } from './clientcredentialsauthenticator.js';
import { OpenId } from './openid.js'; // For OpenId discovery
import * as oauth from 'oauth4webapi'; // For oauth4webapi types and functions
=======
import { OAuthAuthenticatorBuilder } from './oauthauthenticatorbuilder.js';
import { ClientCredentialsAuthenticator } from './clientcredentialsauthenticator.js';
import { OpenId } from './openid.js';
import * as oauth from 'oauth4webapi';
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
  public constructor(
    host: string,
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {
    super(host);
||||||| Stash base
  public constructor(host: string, clientId: string, clientSecret: string) {
    super(host); // Sets this.originalHost (issuer host for OpenId)
    this.clientId = clientId;
    this.clientSecret = clientSecret;
=======
  public constructor(host: string, clientId: string, clientSecret: string) {
    super(host);
    this.clientId = clientId;
    this.clientSecret = clientSecret;
>>>>>>> Stashed changes
  }

  /**
   * Builds and returns a new ClientCredentialsAuthenticator instance.
   *
   * @returns The constructed ClientCredentialsAuthenticator.
   */
  public async build(): Promise<ClientCredentialsAuthenticator> {
<<<<<<< Updated upstream
    await this.discoverOpenId();
||||||| Stash base
    // 1. Initialize OpenId to get AuthorizationServer metadata
    // this.openIdInstance is from the base OAuthAuthenticatorBuilder
    this.openIdInstance = new OpenId(this.originalHost);
    await this.openIdInstance.init();

    const asMetadata: oauth.AuthorizationServer =
      this.openIdInstance.getServerMetadata();

    // 2. Define ClientMetadata for oauth4webapi
    // This includes client_id and client_secret as per oauth.Client interface requirements
    // for confidential clients using client_secret based authentication.
    const clientMetadata: oauth.Client = {
      client_id: this.clientId,
      client_secret: this.clientSecret, // oauth4webapi's Client type can include client_secret
      token_endpoint_auth_method: 'client_secret_post', // Specify auth method used
      // Other client metadata (e.g., response_types, grant_types) can be added
      // if needed by the AS for this specific client or if you want stricter validation.
    };

    // 3. Define ClientAuth method for oauth4webapi
    // For client credentials grant with a secret, ClientSecretPost or ClientSecretBasic are common.
    // Let's use ClientSecretPost, which aligns with the token_endpoint_auth_method.
    const clientAuth: oauth.ClientAuth = oauth.ClientSecretPost(
      this.clientSecret,
    );

    // 4. Instantiate ClientCredentialsAuthenticator with all necessary parts
=======
    this.openIdInstance = new OpenId(this.originalHost);
    await this.openIdInstance.init();

    const asMetadata: oauth.AuthorizationServer =
      this.openIdInstance.getServerMetadata();

    const clientMetadata: oauth.Client = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      token_endpoint_auth_method: 'client_secret_post',
    };

    const clientAuth: oauth.ClientAuth = oauth.ClientSecretPost(
      this.clientSecret,
    );

>>>>>>> Stashed changes
    return new ClientCredentialsAuthenticator(
      this.openId,
      this.clientId,
<<<<<<< Updated upstream
      this.clientSecret,
      this.authScopes,
||||||| Stash base
      this.authScopes, // from base builder (OAuthAuthenticatorBuilder)
      asMetadata,
      clientMetadata,
      clientAuth,
=======
      this.authScopes,
      asMetadata,
      clientMetadata,
      clientAuth,
>>>>>>> Stashed changes
    );
  }
}
