// file: src/auth/clientcredentialsauthenticator.ts
import { OpenId } from './openid.js';
import * as oauth from 'oauth4webapi';
import type { ClientCredentialsAuthenticatorBuilder } from './clientcredentialsauthenticatorbuilder.js';
// Full import needed for static builder method to instantiate the builder
import { ClientCredentialsAuthenticatorBuilder as ActualClientCredentialsAuthenticatorBuilder } from './clientcredentialsauthenticatorbuilder.js';
import { OAuthAuthenticator } from './oauthauthenticator.js';

export class ClientCredentialsAuthenticator extends OAuthAuthenticator {
  private static readonly GRANT_TYPE = 'client_credentials';

  /**
   * Constructs a ClientCredentialsAuthenticator.
   * @param openId Initialized OpenId instance.
   * @param clientId The OAuth2 client identifier.
   * @param scope The scope for the token request.
   * @param asMetadata The discovered Authorization Server metadata.
   * @param clientMetadata The configured Client metadata for this authenticator.
   * @param clientAuth The configured ClientAuth function for this authenticator.
   */
  public constructor(
    openId: OpenId,
    clientId: string,
    scope: string,
    asMetadata: oauth.AuthorizationServer, // Changed from clientConfig
    clientMetadata: oauth.Client, // New parameter
    clientAuth: oauth.ClientAuth, // New parameter
  ) {
    // Pass the new parameters to the refactored OAuthAuthenticator constructor
    super(openId, clientId, scope, asMetadata, clientMetadata, clientAuth);
  }

  /**
   * Returns a new builder instance for ClientCredentialsAuthenticator.
   * The builder will be responsible for creating asMetadata, clientMetadata, and clientAuth.
   */
  public static builder(
    host: string,
    clientId: string,
    clientSecret: string,
  ): ClientCredentialsAuthenticatorBuilder {
    return new ActualClientCredentialsAuthenticatorBuilder(
      host,
      clientId,
      clientSecret,
    );
  }

  protected getGrantType(): string {
    return ClientCredentialsAuthenticator.GRANT_TYPE;
  }

  protected getAccessTokenOptions(): Record<string, string> {
    const options: Record<string, string> = {
      scope: this.scope,
    };
    // Note: For the 'client_credentials' grant type with oauth4webapi,
    // client authentication (like client_id and client_secret) is handled by the
    // `clientAuth` function (e.g., oauth.ClientSecretPost) passed during the
    // token request (e.g., to oauth.clientCredentialsGrantRequest or oauth.genericTokenEndpointRequest).
    // The `scope` is a primary parameter for the grant itself.
    // Additional parameters required by the AS for this grant could be added here too.
    return options;
  }
}
