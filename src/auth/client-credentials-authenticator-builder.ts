import { OAuthAuthenticatorBuilder } from "./oauth-authenticator-builder.js";
import { ClientCredentialsAuthenticator } from "./client-credentials-authenticator.js";
import { requireText } from "./oauth-authenticator.js";

/**
 * Builder for {@link ClientCredentialsAuthenticator}.
 */
export class ClientCredentialsAuthenticatorBuilder extends OAuthAuthenticatorBuilder {
  private readonly clientId: string;
  private readonly clientSecret: string;

  /**
   * @param host the base URL for the OAuth provider
   * @param clientId the OAuth2 client identifier
   * @param clientSecret the OAuth2 client secret
   * @throws {TypeError} if the host is not a valid http or https URL, or the
   *   client identifier or secret is empty
   */
  public constructor(host: string, clientId: string, clientSecret: string) {
    super(host);
    this.clientId = requireText(clientId, "Client ID");
    this.clientSecret = requireText(clientSecret, "Client secret");
  }

  public build(): ClientCredentialsAuthenticator {
    return new ClientCredentialsAuthenticator(
      this.openId,
      this.clientId,
      this.clientSecret,
      this.scope,
    );
  }
}
