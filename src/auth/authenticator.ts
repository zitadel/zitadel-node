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
  protected readonly hostName: URL;

  /**
   * Authenticator constructor.
   *
   * @param hostName The base URL for all authentication endpoints.
   */
  protected constructor(hostName: string) {
    this.hostName = new URL(new URL(hostName).origin);
  }

  /**
   * Retrieve the authentication token needed for API requests.
   *
   * @returns The authentication token.
   */
  public abstract getAuthToken(): Promise<string>;

  /**
   * Retrieve the host URL.
   *
   * @returns The base URL for authentication endpoints.
   */
  public getHost(): URL {
    return this.hostName;
  }
}
