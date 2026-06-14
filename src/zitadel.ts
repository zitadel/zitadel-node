// Zitadel SDK
// The Zitadel SDK is a convenience wrapper around the Zitadel APIs to assist you in integrating with your Zitadel environment. This SDK enables you to handle resources, settings, and configurations within the Zitadel platform.
//
// The version of the OpenAPI document: 1.0.0
//
// This file is hand-maintained (listed in .openapi-generator-ignore): it is
// the package's public `Zitadel` facade, distinct from the generated `Client`.

import type { ApiClient } from "./api-client.js";
import { Configuration } from "./configuration.js";
import { DefaultApiClient } from "./default-api-client.js";
import { TransportOptions } from "./transport-options.js";
import type { Authenticator } from "./auth/authenticator.js";
import { isHttpAwareAuthenticator } from "./auth/http-aware-authenticator.js";
import { OAuthAuthenticator } from "./auth/oauth-authenticator.js";
import { PersonalAccessAuthenticator } from "./auth/personal-access-authenticator.js";
import { ClientCredentialsAuthenticator } from "./auth/client-credentials-authenticator.js";
import { WebTokenAuthenticator } from "./auth/webtoken-authenticator.js";

import { ActionServiceApi } from "./api/action-service-api.js";
import { ApplicationServiceApi } from "./api/application-service-api.js";
import { AuthorizationServiceApi } from "./api/authorization-service-api.js";
import { BetaActionServiceApi } from "./api/beta-action-service-api.js";
import { BetaAppServiceApi } from "./api/beta-app-service-api.js";
import { BetaAuthorizationServiceApi } from "./api/beta-authorization-service-api.js";
import { BetaFeatureServiceApi } from "./api/beta-feature-service-api.js";
import { BetaInstanceServiceApi } from "./api/beta-instance-service-api.js";
import { BetaInternalPermissionServiceApi } from "./api/beta-internal-permission-service-api.js";
import { BetaOIDCServiceApi } from "./api/beta-oidc-service-api.js";
import { BetaOrganizationServiceApi } from "./api/beta-organization-service-api.js";
import { BetaProjectServiceApi } from "./api/beta-project-service-api.js";
import { BetaSessionServiceApi } from "./api/beta-session-service-api.js";
import { BetaSettingsServiceApi } from "./api/beta-settings-service-api.js";
import { BetaTelemetryServiceApi } from "./api/beta-telemetry-service-api.js";
import { BetaUserServiceApi } from "./api/beta-user-service-api.js";
import { BetaWebKeyServiceApi } from "./api/beta-web-key-service-api.js";
import { FeatureServiceApi } from "./api/feature-service-api.js";
import { IdentityProviderServiceApi } from "./api/identity-provider-service-api.js";
import { InstanceServiceApi } from "./api/instance-service-api.js";
import { InternalPermissionServiceApi } from "./api/internal-permission-service-api.js";
import { OIDCServiceApi } from "./api/oidc-service-api.js";
import { OrganizationServiceApi } from "./api/organization-service-api.js";
import { ProjectServiceApi } from "./api/project-service-api.js";
import { SAMLServiceApi } from "./api/saml-service-api.js";
import { SessionServiceApi } from "./api/session-service-api.js";
import { SettingsServiceApi } from "./api/settings-service-api.js";
import { UserServiceApi } from "./api/user-service-api.js";
import { WebKeyServiceApi } from "./api/web-key-service-api.js";

/**
 * Wrap an API instance so that, when it is backed by an
 * {@link OAuthAuthenticator}, the access token is minted (or refreshed)
 * before any operation runs.
 *
 * The {@link Authenticator} contract exposes a synchronous `getAuthHeaders`,
 * but Node has no blocking HTTP, so an OAuth token cannot be minted inside
 * that method. Every generated API method is async, so this Proxy awaits
 * {@link OAuthAuthenticator.prime} before delegating to the real method. This
 * keeps token exchange (and any auth failure) on the API-call path rather than
 * forcing it eagerly at construction time.
 *
 * @param api the API instance to wrap
 * @param oauth the OAuth authenticator whose token must be primed, or null
 */
function withPriming<T extends object>(
  api: T,
  oauth: OAuthAuthenticator | null,
): T {
  if (oauth === null) {
    return api;
  }
  return new Proxy(api, {
    get(target, prop, receiver): unknown {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") {
        return value;
      }
      const method = value as (...args: unknown[]) => unknown;
      return async (...args: unknown[]): Promise<unknown> => {
        await oauth.prime();
        return method.apply(target, args);
      };
    },
  });
}

/**
 * Main entry point for the Zitadel SDK.
 *
 * Provides access to all Zitadel API services through a single client
 * instance, plus static factory methods for the supported authentication
 * flows (personal access token, OAuth2 client credentials, JWT-bearer
 * private key).
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
   * If the authenticator implements `HttpAwareAuthenticator`, the shared
   * {@link ApiClient} is injected so that token exchange and discovery use the
   * same transport configuration as regular API calls.
   *
   * @param authenticator The authenticator to use for API requests.
   * @param transportOptions Optional transport options for TLS, proxy, and headers.
   */
  public constructor(
    authenticator: Authenticator,
    transportOptions?: TransportOptions,
  ) {
    const transport = transportOptions ?? TransportOptions.builder().build();
    const apiClient: ApiClient = new DefaultApiClient(transport);

    if (isHttpAwareAuthenticator(authenticator)) {
      authenticator.setApiClient(apiClient);
    }

    const oauth =
      authenticator instanceof OAuthAuthenticator ? authenticator : null;

    const config = Configuration.builder()
      .baseUrl(authenticator.getHost())
      .build();

    const make = <T extends object>(
      ctor: new (c: ApiClient, cfg: Configuration, a: Authenticator) => T,
    ): T => withPriming(new ctor(apiClient, config, authenticator), oauth);

    this.actions = make(ActionServiceApi);
    this.applications = make(ApplicationServiceApi);
    this.authorizations = make(AuthorizationServiceApi);
    this.betaActions = make(BetaActionServiceApi);
    this.betaApps = make(BetaAppServiceApi);
    this.betaAuthorizations = make(BetaAuthorizationServiceApi);
    this.betaFeatures = make(BetaFeatureServiceApi);
    this.betaInstances = make(BetaInstanceServiceApi);
    this.betaInternalPermissions = make(BetaInternalPermissionServiceApi);
    this.betaOidc = make(BetaOIDCServiceApi);
    this.betaOrganizations = make(BetaOrganizationServiceApi);
    this.betaProjects = make(BetaProjectServiceApi);
    this.betaSessions = make(BetaSessionServiceApi);
    this.betaSettings = make(BetaSettingsServiceApi);
    this.betaTelemetry = make(BetaTelemetryServiceApi);
    this.betaUsers = make(BetaUserServiceApi);
    this.betaWebkeys = make(BetaWebKeyServiceApi);
    this.features = make(FeatureServiceApi);
    this.idps = make(IdentityProviderServiceApi);
    this.instances = make(InstanceServiceApi);
    this.internalPermissions = make(InternalPermissionServiceApi);
    this.oidc = make(OIDCServiceApi);
    this.organizations = make(OrganizationServiceApi);
    this.projects = make(ProjectServiceApi);
    this.saml = make(SAMLServiceApi);
    this.sessions = make(SessionServiceApi);
    this.settings = make(SettingsServiceApi);
    this.users = make(UserServiceApi);
    this.webkeys = make(WebKeyServiceApi);
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
      transportOptions,
    );
  }

  /**
   * Initialize the SDK using the OAuth2 Client Credentials flow.
   *
   * @param host API URL.
   * @param clientId OAuth2 client identifier.
   * @param clientSecret OAuth2 client secret.
   * @param transportOptions Optional transport options for TLS, proxy, and headers.
   * @returns Configured Zitadel client instance with token auto-refresh.
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

    return new this(authenticator, transportOptions);
  }

  /**
   * Initialize the SDK via a Private Key JWT assertion.
   *
   * @param host API URL.
   * @param keyFile Path to the service-account JSON key file.
   * @param transportOptions Optional transport options for TLS, proxy, and headers.
   * @returns Configured Zitadel client instance using JWT-bearer assertions.
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

    return new this(authenticator, transportOptions);
  }
}
