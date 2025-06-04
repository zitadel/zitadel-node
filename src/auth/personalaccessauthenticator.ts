// file: src/auth/personalaccessauthenticator.ts
import { Authenticator } from './authenticator.js';

/**
 * Personal Access Token Authenticator.
 *
 * Uses a static personal access token for API authentication.
 */
export class PersonalAccessAuthenticator extends Authenticator {
  /**
   * The personal access token.
   */
  private token: string;

  /**
   * PersonalAccessAuthenticator constructor.
   *
   * @param host The base URL for the API endpoints.
   * @param token The personal access token.
   */
  public constructor(host: string, token: string) {
    super(host);
    if (token === null || token === undefined) {
      throw new TypeError('Token cannot be null or undefined.');
    }
    this.token = token;
  }

  /**
   * Retrieve authentication token using the personal access token.
   *
   * @returns The authentication token.
   */
  public getAuthToken(): string {
    return this.token;
  }
}
