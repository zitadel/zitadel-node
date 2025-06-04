// file: src/auth/authenticator.ts

/**
 * Base abstract class for all authentication strategies.
 *
 * This class defines a standard interface for retrieving authentication headers
 * for API requests.
 */
export abstract class Authenticator {
  /**
   * The base URL for authentication endpoints.
   */
  protected hostName: URL;

  /**
   * Authenticator constructor.
   *
   * @param hostName The base URL for all authentication endpoints.
   */
  public constructor(hostName: string) {
    let fullUrl = hostName;
    if (!/^https?:\/\//.test(hostName)) {
      fullUrl = 'https://' + hostName;
    }
    this.hostName = new URL(fullUrl);
  }

  /**
   * Retrieve the authentication token needed for API requests.
   * @returns A string or a Promise resolving to a string, representing the authentication token.
   */
  abstract getAuthToken(): Promise<string> | string;

  /**
   * Retrieve the host URL.
   *
   * @returns The base URL for authentication endpoints.
   */
  public getHost(): URL {
    return this.hostName;
  }
}
