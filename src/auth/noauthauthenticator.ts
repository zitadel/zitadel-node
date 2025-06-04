// file: src/auth/noauthauthenticator.ts
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
   * @param host The base URL for all authentication endpoints. Defaults to 'localhost'.
   */
  public constructor(host: string = 'localhost') {
    super(host);
  }

  /**
   * Retrieve the authentication token needed for API requests.
   *
   * @returns An empty string as no authentication is used.
   */
  public getAuthToken(): string {
    return '';
  }
}
