import { BaseAuthenticator } from "./base-authenticator.js";
import { OpenId } from "./open-id.js";

/**
 * A no-op authenticator that performs no authentication.
 *
 * Useful for testing and unauthenticated endpoints: it never mints a token, so
 * it returns an empty set of auth headers.
 */
export class NoAuthAuthenticator extends BaseAuthenticator {
  private readonly host: string;

  /**
   * @param host the base URL for the API endpoints
   * @throws {TypeError} if the host is not a valid http or https URL
   */
  public constructor(host: string = "http://localhost") {
    super();
    this.host = new OpenId(host).getHostEndpoint();
  }

  public getHost(): string {
    return this.host;
  }

  public getAuthHeaders(): Record<string, string> {
    return {};
  }
}
