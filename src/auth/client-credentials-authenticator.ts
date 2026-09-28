import { OAuthAuthenticator } from "./oauth-authenticator.js";
import type { OpenId } from "./open-id.js";
import { ClientCredentialsAuthenticatorBuilder } from "./client-credentials-authenticator-builder.js";
import { DEFAULT_SCOPE } from "./oauth-authenticator-builder.js";

/**
 * OAuth authenticator implementing the client-credentials flow (RFC 6749 §4.4).
 *
 * Mints a bearer token by POSTing client_id / client_secret to the provider's
 * token endpoint through the SDK's shared transport. See
 * {@link OAuthAuthenticator} for the caching and HTTP-injection contract.
 */
export class ClientCredentialsAuthenticator extends OAuthAuthenticator {
  /**
   * @param openId the OpenID discovery helper for the target host
   * @param clientId the OAuth2 client identifier
   * @param clientSecret the OAuth2 client secret
   * @param scope the space-delimited scope string for the token request
   */
  public constructor(
    openId: OpenId,
    private readonly clientId: string,
    private readonly clientSecret: string,
    scope: string = DEFAULT_SCOPE,
  ) {
    super(openId, scope);
  }

  /**
   * Returns a builder for a ClientCredentialsAuthenticator.
   *
   * @param host the base URL for the OAuth provider
   * @param clientId the OAuth2 client identifier
   * @param clientSecret the OAuth2 client secret
   * @throws {TypeError} if the host is not a valid http or https URL, or the
   *   client identifier or secret is empty
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

  protected getGrantType(): string {
    return "client_credentials";
  }

  protected getTokenRequestParams(): Record<string, string> {
    return { client_id: this.clientId, client_secret: this.clientSecret };
  }

  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return `${this.constructor.name}(host=${this.getHost()}, clientId=${this.clientId}, clientSecret=***, scope=${this.scope}, accessToken=${this.maskedToken()})`;
  }

  override toJSON(): Record<string, unknown> {
    return {
      host: this.getHost(),
      clientId: this.clientId,
      clientSecret: "***",
      scope: this.scope,
      accessToken: this.maskedToken(),
    };
  }
}
