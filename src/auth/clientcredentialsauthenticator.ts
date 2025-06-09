import { OpenId } from './openid.js';
import * as oauth from 'oauth4webapi';
import type { ClientCredentialsAuthenticatorBuilder } from './clientcredentialsauthenticatorbuilder.js';
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
    asMetadata: oauth.AuthorizationServer,
    clientMetadata: oauth.Client,
    clientAuth: oauth.ClientAuth,
  ) {
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
    return {
      scope: this.scope,
    };
  }
}
