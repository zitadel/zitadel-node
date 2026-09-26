import { OpenId } from "./open-id.js";
import type { OAuthAuthenticator } from "./oauth-authenticator.js";

/** The default scopes requested when none are configured. */
export const DEFAULT_SCOPE =
  "openid urn:zitadel:iam:org:project:id:zitadel:aud";

/**
 * Abstract builder for OAuth authenticators.
 *
 * Holds the OpenID discovery helper for the host and the requested scopes.
 */
export abstract class OAuthAuthenticatorBuilder {
  protected readonly openId: OpenId;
  protected scope: string = DEFAULT_SCOPE;

  /**
   * @param host the base URL for the OAuth provider
   * @throws {TypeError} if the host is not a valid http or https URL
   */
  protected constructor(host: string) {
    this.openId = new OpenId(host);
  }

  /**
   * Overrides the default scopes. Duplicates are dropped; order is kept.
   *
   * @param authScopes the scopes for the token request
   * @throws {TypeError} if no scope is given, or a scope is empty or contains
   *   whitespace
   */
  public scopes(...authScopes: string[]): this {
    if (authScopes.length === 0) {
      throw new TypeError("At least one scope is required.");
    }
    for (const authScope of authScopes) {
      if (
        typeof authScope !== "string" ||
        authScope === "" ||
        /\s/.test(authScope)
      ) {
        throw new TypeError(
          `Scope must be a non-empty string without whitespace: '${authScope}'`,
        );
      }
    }
    this.scope = [...new Set(authScopes)].join(" ");
    return this;
  }

  public abstract build(): OAuthAuthenticator;
}
