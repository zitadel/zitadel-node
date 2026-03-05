import { OpenId } from './openid.js';
import { OAuthAuthenticator } from './oauth-authenticator.js';
import type { TransportOptions } from '../transport-options.js';

/**
 * Base builder for OAuth authenticators.
 *
 * Provides fluent methods to override the default token endpoint and scopes.
 * Subclasses extend this builder to construct specific OAuthAuthenticator
 * instances.
 */
export abstract class OAuthAuthenticatorBuilder {
  protected authScopes: string =
    'openid urn:zitadel:iam:org:project:id:zitadel:aud';
  protected openId!: OpenId;

  /**
   * Constructs the builder with the required host.
   *
   * @param host The hostname of the OpenID provider.
   * @param transportOptions Optional transport options for TLS and headers.
   */
  protected constructor(
    protected readonly host: string,
    protected readonly transportOptions?: TransportOptions,
  ) {}

  /**
   * Overrides the default scopes.
   *
   * @param scopes A list of scopes for the token request.
   * @returns The builder instance for chaining.
   */
  public scopes(scopes: string | string[]): this {
    this.authScopes = Array.isArray(scopes) ? scopes.join(' ') : scopes;
    return this;
  }

  protected async discoverOpenId(): Promise<void> {
    if (!this.openId) {
      this.openId = await OpenId.discover(this.host, this.transportOptions);
    }
  }

  public abstract build(): Promise<OAuthAuthenticator>;
}
