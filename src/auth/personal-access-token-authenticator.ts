import { BaseAuthenticator } from "./base-authenticator.js";
import { OpenId } from "./open-id.js";
import { requireText } from "./oauth-authenticator.js";

/**
 * Personal Access Token Authenticator.
 *
 * Uses a static personal access token (PAT) for API authentication. A PAT is a
 * long-lived bearer credential minted out-of-band in the Zitadel console, so no
 * token exchange is required: the token is attached verbatim on every request.
 */
export class PersonalAccessTokenAuthenticator extends BaseAuthenticator {
  private readonly host: string;
  private readonly token: string;

  /**
   * @param host the base URL for the API endpoints
   * @param token the personal access token
   * @throws {TypeError} if the host is not a valid http or https URL or the
   *   token is empty
   */
  public constructor(host: string, token: string) {
    super();
    this.host = new OpenId(host).getHostEndpoint();
    this.token = requireText(token, "Token");
  }

  public getHost(): string {
    return this.host;
  }

  public getAuthHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.token}` };
  }

  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return `${this.constructor.name}(host=${this.host}, token=***)`;
  }

  toJSON(): Record<string, string> {
    return { host: this.host, token: "***" };
  }
}
