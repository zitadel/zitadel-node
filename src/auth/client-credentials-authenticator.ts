import { OAuthAuthenticator } from "./oauth-authenticator.js";
import { OpenId } from "./openid.js";
import { ClientCredentialsAuthenticatorBuilder } from "./client-credentials-authenticator-builder.js";
import * as oauth from "oauth4webapi";
import type { TransportOptions } from "../transport-options.js";

/**
 * OAuth2 Client Credentials Authenticator.
 *
 * Implements the OAuth2 client credentials grant to obtain an access token.
 */
export class ClientCredentialsAuthenticator extends OAuthAuthenticator {
  private readonly clientAuth: oauth.ClientAuth;
  private readonly parameters: URLSearchParams;
  private readonly hasClientSecret: boolean;

  /**
   * Constructs a ClientCredentialsAuthenticator.
   *
   * @param openId The base URL for the API endpoints.
   * @param clientId The OAuth2 client identifier.
   * @param clientSecret The OAuth2 client secret.
   * @param scope The scope for the token request.
   * @param transportOptions Optional transport options for TLS, proxy, and headers.
   */
  public constructor(
    openId: OpenId,
    clientId: string,
    clientSecret: string,
    scope: string = "openid urn:zitadel:iam:org:project:id:zitadel:aud",
    transportOptions?: TransportOptions,
  ) {
    const authServer = openId.getAuthorizationServer();
    const client: oauth.Client = { client_id: clientId };
    super(
      openId.getHostEndpoint(),
      authServer,
      client,
      scope,
      transportOptions,
    );
    this.clientAuth = oauth.ClientSecretPost(clientSecret);
    this.hasClientSecret = clientSecret.length > 0;
    this.parameters = new URLSearchParams({
      grant_type: "client_credentials",
      scope: this.scope,
    });
  }

  /**
   * Redacted inspection representation.
   *
   * Extends {@link OAuthAuthenticator}'s masking to also report the client
   * secret as `***` (when present), so the OAuth2 client credential never
   * leaks through `console.log(auth)` or `util.inspect(auth)` into
   * application logs. The client id stays visible for diagnostics.
   */
  [Symbol.for("nodejs.util.inspect.custom")](): string {
    const accessToken = this.token?.access_token ? "***" : null;
    const clientSecret = this.hasClientSecret ? "***" : null;
    return `${this.constructor.name}(host=${this.getHost()}, clientId=${this.client.client_id}, clientSecret=${clientSecret}, scope=${this.scope}, accessToken=${accessToken}, tokenExpiry=${this.tokenExpiry})`;
  }

  /**
   * Redacted JSON representation.
   *
   * Ensures `JSON.stringify(auth)` masks the client secret as `***` (when
   * present) in addition to the cached access token, consistent with the
   * inspection representation.
   */
  override toJSON(): Record<string, unknown> {
    return {
      host: this.getHost(),
      clientId: this.client.client_id,
      clientSecret: this.hasClientSecret ? "***" : null,
      scope: this.scope,
      accessToken: this.token?.access_token ? "***" : null,
      tokenExpiry: this.tokenExpiry,
    };
  }

  /**
   * Returns a new builder instance for ClientCredentialsAuthenticator.
   *
   * @param host The base URL for API endpoints.
   * @param clientId The OAuth2 client identifier.
   * @param clientSecret The OAuth2 client secret.
   * @param transportOptions Optional transport options for TLS, proxy, and headers.
   * @returns A new builder instance.
   */
  public static builder(
    host: string,
    clientId: string,
    clientSecret: string,
    transportOptions?: TransportOptions,
  ): ClientCredentialsAuthenticatorBuilder {
    return new ClientCredentialsAuthenticatorBuilder(
      host,
      clientId,
      clientSecret,
      transportOptions,
    );
  }

  protected async performTokenRequest(
    authServer: oauth.AuthorizationServer,
    client: oauth.Client,
  ): Promise<oauth.TokenEndpointResponse> {
    const tokenOptions = this.buildTokenRequestOptions();

    if (process.env.JEST_WORKER_ID !== undefined) {
      tokenOptions[oauth.allowInsecureRequests] = true;
    }

    // noinspection JSDeprecatedSymbols
    const response = await oauth.clientCredentialsGrantRequest(
      authServer,
      client,
      this.clientAuth,
      this.parameters,
      tokenOptions,
    );

    return oauth.processClientCredentialsResponse(authServer, client, response);
  }
}
