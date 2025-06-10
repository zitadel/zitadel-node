import { OAuthAuthenticator } from './oauth-authenticator.js';
import { OpenId } from './openid.js';
import { ClientCredentialsAuthenticatorBuilder } from './client-credentials-authenticator-builder.js';
import * as oauth from 'oauth4webapi';

/**
 * OAuth2 Client Credentials Authenticator.
 *
 * Implements the OAuth2 client credentials grant to obtain an access token.
 */
export class ClientCredentialsAuthenticator extends OAuthAuthenticator {
  private readonly clientAuth: oauth.ClientAuth;
  private readonly parameters: URLSearchParams;

  /**
   * Constructs a ClientCredentialsAuthenticator.
   *
   * @param openId The base URL for the API endpoints.
   * @param clientId The OAuth2 client identifier.
   * @param clientSecret The OAuth2 client secret.
   * @param scope The scope for the token request.
   */
  public constructor(
    openId: OpenId,
    clientId: string,
    clientSecret: string,
    scope: string = 'openid urn:zitadel:iam:org:project:id:zitadel:aud',
  ) {
    const authServer = openId.getAuthorizationServer();
    const client: oauth.Client = { client_id: clientId };
    super(authServer, client, scope);
    this.clientAuth = oauth.ClientSecretBasic(clientSecret);
    this.parameters = new URLSearchParams({
      grant_type: 'client_credentials',
      scope: this.scope,
    });
  }

  /**
   * Returns a new builder instance for ClientCredentialsAuthenticator.
   *
   * @param host The base URL for API endpoints.
   * @param clientId The OAuth2 client identifier.
   * @param clientSecret The OAuth2 client secret.
   * @returns A new builder instance.
   */
  public static builder(
    host: string,
    clientId: string,
    clientSecret: string,
  ): ClientCredentialsAuthenticatorBuilder {
    return new ClientCredentialsAuthenticatorBuilder(
      host,
      clientId,
      clientSecret,
    );
  }

  protected async performTokenRequest(
    authServer: oauth.AuthorizationServer,
    client: oauth.Client,
  ): Promise<oauth.TokenEndpointResponse> {
    // noinspection JSDeprecatedSymbols
    const response = await oauth.clientCredentialsGrantRequest(
      authServer,
      client,
      this.clientAuth,
      this.parameters,
      {
        [oauth.allowInsecureRequests]: process.env.JEST_WORKER_ID !== undefined,
      },
    );

    return oauth.processClientCredentialsResponse(authServer, client, response);
  }
}
