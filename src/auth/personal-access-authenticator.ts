import { BearerAuthenticator } from "./bearer-authenticator.js";

/**
 * Personal Access Token Authenticator.
 *
 * Uses a static personal access token for API authentication. A PAT is a
 * long-lived bearer token, so this is a thin specialisation of
 * {@link BearerAuthenticator}.
 */
export class PersonalAccessAuthenticator extends BearerAuthenticator {
  /**
   * @param host The base URL for the API endpoints.
   * @param token The personal access token.
   */
  public constructor(host: string, token: string) {
    super(host, token);
  }
}
