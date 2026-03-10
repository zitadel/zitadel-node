import {
  ActionServiceApi,
  ApplicationServiceApi,
  AuthorizationServiceApi,
  BetaActionServiceApi,
  BetaAppServiceApi,
  BetaAuthorizationServiceApi,
  BetaFeatureServiceApi,
  BetaInstanceServiceApi,
  BetaInternalPermissionServiceApi,
  BetaOIDCServiceApi,
  BetaOrganizationServiceApi,
  BetaProjectServiceApi,
  BetaSessionServiceApi,
  BetaSettingsServiceApi,
  BetaTelemetryServiceApi,
  BetaUserServiceApi,
  BetaWebKeyServiceApi,
  FeatureServiceApi,
  IdentityProviderServiceApi,
  InstanceServiceApi,
  InternalPermissionServiceApi,
  OIDCServiceApi,
  OrganizationServiceApi,
  ProjectServiceApi,
  SAMLServiceApi,
  SessionServiceApi,
  SettingsServiceApi,
  UserServiceApi,
  WebKeyServiceApi,
} from './apis/index.js';
import {
  Authenticator,
  ClientCredentialsAuthenticator,
  PersonalAccessAuthenticator,
  WebTokenAuthenticator,
} from './auth/index.js';
import { Configuration } from './configuration.js';
import type { TransportOptions } from './transport-options.js';

export * from './zitadel-exception.js';
export * from './api-exception.js';
export * from './configuration.js';
export * from './models/index.js';
export * from './auth/index.js';

/**
 * Main entry point for the Zitadel SDK.
 *
 * Provides access to all Zitadel API services through a single client instance.
 */
export default class Zitadel {
  public readonly actions: ActionServiceApi;
  public readonly applications: ApplicationServiceApi;
  public readonly authorizations: AuthorizationServiceApi;
  public readonly betaActions: BetaActionServiceApi;
  public readonly betaApps: BetaAppServiceApi;
  public readonly betaAuthorizations: BetaAuthorizationServiceApi;
  public readonly betaFeatures: BetaFeatureServiceApi;
  public readonly betaInstances: BetaInstanceServiceApi;
  public readonly betaInternalPermissions: BetaInternalPermissionServiceApi;
  public readonly betaOidc: BetaOIDCServiceApi;
  public readonly betaOrganizations: BetaOrganizationServiceApi;
  public readonly betaProjects: BetaProjectServiceApi;
  public readonly betaSessions: BetaSessionServiceApi;
  public readonly betaSettings: BetaSettingsServiceApi;
  public readonly betaTelemetry: BetaTelemetryServiceApi;
  public readonly betaUsers: BetaUserServiceApi;
  public readonly betaWebkeys: BetaWebKeyServiceApi;
  public readonly features: FeatureServiceApi;
  public readonly idps: IdentityProviderServiceApi;
  public readonly instances: InstanceServiceApi;
  public readonly internalPermissions: InternalPermissionServiceApi;
  public readonly oidc: OIDCServiceApi;
  public readonly organizations: OrganizationServiceApi;
  public readonly projects: ProjectServiceApi;
  public readonly saml: SAMLServiceApi;
  public readonly sessions: SessionServiceApi;
  public readonly settings: SettingsServiceApi;
  public readonly users: UserServiceApi;
  public readonly webkeys: WebKeyServiceApi;

  /**
   * Constructs a new Zitadel client instance.
   *
   * @param authenticator The authenticator to use for API requests.
   * @param mutateConfig Optional callback to mutate the configuration.
   * @param transportOptions Optional transport options for TLS, proxy, and headers.
   */
  public constructor(
    authenticator: Authenticator,
    mutateConfig?: (config: Configuration) => void,
    transportOptions?: TransportOptions,
  ) {
    const config = new Configuration(authenticator, { transportOptions });

    if (mutateConfig) {
      mutateConfig(config);
    }

    this.actions = new ActionServiceApi(config);
    this.applications = new ApplicationServiceApi(config);
    this.authorizations = new AuthorizationServiceApi(config);
    this.betaActions = new BetaActionServiceApi(config);
    this.betaApps = new BetaAppServiceApi(config);
    this.betaAuthorizations = new BetaAuthorizationServiceApi(config);
    this.betaFeatures = new BetaFeatureServiceApi(config);
    this.betaInstances = new BetaInstanceServiceApi(config);
    this.betaInternalPermissions = new BetaInternalPermissionServiceApi(config);
    this.betaOidc = new BetaOIDCServiceApi(config);
    this.betaOrganizations = new BetaOrganizationServiceApi(config);
    this.betaProjects = new BetaProjectServiceApi(config);
    this.betaSessions = new BetaSessionServiceApi(config);
    this.betaSettings = new BetaSettingsServiceApi(config);
    this.betaTelemetry = new BetaTelemetryServiceApi(config);
    this.betaUsers = new BetaUserServiceApi(config);
    this.betaWebkeys = new BetaWebKeyServiceApi(config);
    this.features = new FeatureServiceApi(config);
    this.idps = new IdentityProviderServiceApi(config);
    this.instances = new InstanceServiceApi(config);
    this.internalPermissions = new InternalPermissionServiceApi(config);
    this.oidc = new OIDCServiceApi(config);
    this.organizations = new OrganizationServiceApi(config);
    this.projects = new ProjectServiceApi(config);
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
   * @param transportOptions Optional transport options for TLS, proxy, and headers.
   * @returns Configured Zitadel client instance.
   * @see https://zitadel.com/docs/guides/integrate/service-users/personal-access-token
   */
  public static withAccessToken(
    host: string,
    accessToken: string,
    transportOptions?: TransportOptions,
  ): Zitadel {
    return new this(
      new PersonalAccessAuthenticator(host, accessToken),
      undefined,
      transportOptions,
    );
  }

  /**
   * Initialize the SDK using OAuth2 Client Credentials flow.
   *
   * @param host API URL.
   * @param clientId OAuth2 client identifier.
   * @param clientSecret OAuth2 client secret.
   * @param transportOptions Optional transport options for TLS, proxy, and headers.
   * @returns Configured Zitadel client instance with token auto-refresh.
   * @throws {Error} If token retrieval fails.
   * @see https://zitadel.com/docs/guides/integrate/service-users/client-credentials
   */
  public static async withClientCredentials(
    host: string,
    clientId: string,
    clientSecret: string,
    transportOptions?: TransportOptions,
  ): Promise<Zitadel> {
    const authenticator = await ClientCredentialsAuthenticator.builder(
      host,
      clientId,
      clientSecret,
      transportOptions,
    ).build();

    return new this(authenticator, undefined, transportOptions);
  }

  /**
   * Initialize the SDK via Private Key JWT assertion.
   *
   * @param host API URL.
   * @param keyFile Path to service account JSON or PEM key file.
   * @param transportOptions Optional transport options for TLS, proxy, and headers.
   * @returns Configured Zitadel client instance using JWT assertion.
   * @throws {Error} If key parsing or token exchange fails.
   * @see https://zitadel.com/docs/guides/integrate/service-users/private-key-jwt
   */
  public static async withPrivateKey(
    host: string,
    keyFile: string,
    transportOptions?: TransportOptions,
  ): Promise<Zitadel> {
    const authenticator = await WebTokenAuthenticator.fromJson(
      host,
      keyFile,
      transportOptions,
    );

    return new this(authenticator, undefined, transportOptions);
  }
}
