import { OpenId } from './openid.js';

/**
 * Base builder for OAuth authenticators.
 *
 * Provides fluent methods to override scopes.
 * Subclasses extend this builder to construct specific OAuthAuthenticator instances.
 */
export abstract class OAuthAuthenticatorBuilder {
  protected openIdInstance!: OpenId;
  protected authScopes: string =
    'openid urn:zitadel:iam:org:project:id:zitadel:aud';
  protected originalHost: string;

  /**
   * Constructs the builder with the required host.
   *
   * @param hostName The hostname for OpenID discovery.
   */
  protected constructor(hostName: string) {
    if (!hostName || hostName.trim() === '') {
      throw new TypeError('HostName cannot be empty for builder.');
    }
    this.originalHost = hostName;
  }

  /**
   * Initializes the OpenId instance. Should be called by subclass build methods.
   */
  protected async initializeOpenId(): Promise<void> {
    if (!this.openIdInstance) {
      this.openIdInstance = new OpenId(this.originalHost);
      await this.openIdInstance.init();
    }
  }

  /**
   * Overrides the default scopes.
   *
   * @param authScopes A list of scopes for the token request.
   * @returns This builder instance for fluent chaining.
   */
  public scopes(authScopes: string[]): this {
    if (!authScopes || authScopes.length === 0) {
      this.authScopes = '';
    } else {
      this.authScopes = authScopes.join(' ');
    }
    return this;
  }
}
