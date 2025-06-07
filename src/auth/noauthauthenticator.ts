import { Authenticator } from './authenticator.js';

/**
 * Dummy Authenticator for testing purposes.
 *
 * This authenticator does not apply any authentication to API requests.
 */
export class NoAuthAuthenticator extends Authenticator {
  /**
   * NoAuthAuthenticator constructor.
   *
   * @param host The base URL for all authentication endpoints.
   */
  public constructor(host: string = 'http://localhost') {
    super(host);
  }

  /**
   * Retrieve the authentication token needed for API requests.
   *
   * @returns The authentication token.
   */
  public getAuthToken(): Promise<string> {
    return Promise.resolve('');
  }
}
