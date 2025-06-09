import {
  ActionServiceApi,
  FeatureServiceApi,
  IdentityProviderServiceApi,
  OIDCServiceApi,
  OrganizationServiceApi,
  SAMLServiceApi,
  SessionServiceApi,
  SettingsServiceApi,
  UserServiceApi,
  WebKeyServiceApi,
} from './apis/index.js';
import { Authenticator } from './auth/authenticator.js';
import { Configuration } from './configuration.js';
import { ClientCredentialsAuthenticator } from './auth/client-credentials-authenticator.js';
import { PersonalAccessAuthenticator } from './auth/personal-access-authenticator.js';
import { WebTokenAuthenticator } from './auth/webtoken-authenticator.js';

// noinspection JSUnusedGlobalSymbols
export default class Zitadel {
  public readonly actions: ActionServiceApi;
  public readonly features: FeatureServiceApi;
  public readonly idps: IdentityProviderServiceApi;
  public readonly oidc: OIDCServiceApi;
  public readonly organizations: OrganizationServiceApi;
  public readonly saml: SAMLServiceApi;
  public readonly sessions: SessionServiceApi;
  public readonly settings: SettingsServiceApi;
  public readonly users: UserServiceApi;
  public readonly webkeys: WebKeyServiceApi;

  public constructor(
    authenticator: Authenticator,
    mutateConfig?: (config: Configuration) => void,
  ) {
    const config = new Configuration(authenticator);

    if (mutateConfig) {
      mutateConfig(config);
    } else {
      // No mutation by default.
    }

    this.actions = new ActionServiceApi(config);
    this.features = new FeatureServiceApi(config);
    this.idps = new IdentityProviderServiceApi(config);
    this.oidc = new OIDCServiceApi(config);
    this.organizations = new OrganizationServiceApi(config);
    this.saml = new SAMLServiceApi(config);
    this.sessions = new SessionServiceApi(config);
    this.settings = new SettingsServiceApi(config);
    this.users = new UserServiceApi(config);
    this.webkeys = new WebKeyServiceApi(config);
  }

  /**
   * Initialize the SDK with a Personal Access Token (PAT).
   *
   * @param host API URL (e.g. "https://api.zitadel.example.com").
   * @param accessToken Personal Access Token for Bearer authentication.
   * @returns Configured Zitadel client instance.
   * @see https://zitadel.com/docs/guides/integrate/service-users/personal-access-token
   */
  public static withAccessToken(host: string, accessToken: string): Zitadel {
    return new this(new PersonalAccessAuthenticator(host, accessToken));
  }

  /**
   * Initialize the SDK using OAuth2 Client Credentials flow.
   *
   * @param host API URL.
   * @param clientId OAuth2 client identifier.
   * @param clientSecret OAuth2 client secret.
   * @returns Configured Zitadel client instance with token auto-refresh.
   * @throws {Error} If token retrieval fails.
   * @see https://zitadel.com/docs/guides/integrate/service-users/client-credentials
   */
  public static async withClientCredentials(
    host: string,
    clientId: string,
    clientSecret: string,
  ): Promise<Zitadel> {
    const authenticator = await ClientCredentialsAuthenticator.builder(
      host,
      clientId,
      clientSecret,
    ).build();

    return new this(authenticator);
  }

  /**
   * Initialize the SDK via Private Key JWT assertion.
   *
   * @param host API URL.
   * @param keyFile Path to service account JSON or PEM key file.
   * @returns Configured Zitadel client instance using JWT assertion.
   * @throws {Error} If key parsing or token exchange fails.
   * @see https://zitadel.com/docs/guides/integrate/service-users/private-key-jwt
   */
  public static async withPrivateKey(
    host: string,
    keyFile: string,
  ): Promise<Zitadel> {
    const authenticator = await WebTokenAuthenticator.fromJson(host, keyFile);

    return new this(authenticator);
  }
}
