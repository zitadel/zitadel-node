import { Authenticator } from './authenticator.js';

/**
 * Personal Access Token Authenticator.
 *
 * Uses a static personal access token for API authentication.
 */
export class PersonalAccessAuthenticator extends Authenticator {
  /**
   * PersonalAccessAuthenticator constructor.
   *
   * @param host The base URL for the API endpoints.
   * @param token The personal access token.
   */
  public constructor(
    host: string,
    private readonly token: string,
  ) {
    super(host);
  }

  /**
   * Retrieve authentication token using the personal access token.
   *
   * @returns The authentication token.
   */
  public getAuthToken(): Promise<string> {
    return Promise.resolve(this.token);
  }
}
