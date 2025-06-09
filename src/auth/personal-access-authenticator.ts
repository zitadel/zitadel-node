import { Authenticator } from './authenticator.js';

/**
 * Personal Access Token Authenticator.
 *
 * Uses a static personal access token for API authentication.
 */
export class PersonalAccessAuthenticator extends Authenticator {
  /**
<<<<<<< Updated upstream:src/auth/personal-access-authenticator.ts
||||||| Stash base:src/auth/personalaccessauthenticator.ts
   * The personal access token.
   */
  private token: string;

  /**
=======
   * The personal access token.
   */
  private readonly token: string;

  /**
>>>>>>> Stashed changes:src/auth/personalaccessauthenticator.ts
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
<<<<<<< Updated upstream:src/auth/personal-access-authenticator.ts
||||||| Stash base:src/auth/personalaccessauthenticator.ts
    if (token === null || token === undefined) {
      throw new TypeError('Token cannot be null or undefined.');
    }
    this.token = token;
=======
    this.token = token;
>>>>>>> Stashed changes:src/auth/personalaccessauthenticator.ts
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
