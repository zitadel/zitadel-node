import { BaseAuthenticator } from "./base-authenticator.js";

/**
 * Dummy Authenticator for testing purposes.
 *
 * This authenticator does not apply any authentication to API requests.
 */
export class NoAuthAuthenticator extends BaseAuthenticator {
  private readonly host: string;

  /**
   * @param host The base URL for all API endpoints.
   */
  public constructor(host: string = "http://localhost") {
    super();
    this.host = host;
  }

  getHost(): string {
    return this.host;
  }

  getAuthHeaders(): Record<string, string> {
    return {};
  }
}
