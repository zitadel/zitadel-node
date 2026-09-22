import { ZitadelError } from "./zitadel-error.js";

/**
 * Error for an OAuth2 token endpoint that answered with a non-2xx status.
 *
 * Carries the RFC 6749 section 5.2 error fields when the response body holds a
 * well-formed OAuth2 error object, and the raw body in every case.
 */
export class OAuth2ServerError extends ZitadelError {
  /**
   * @param statusCode the HTTP status code of the token response
   * @param code the RFC 6749 error code, or null when the body held no OAuth2 error object
   * @param description the human-readable error description, if present
   * @param uri a URI describing the error, if present
   * @param rawBody the raw token response body
   */
  constructor(
    public readonly statusCode: number,
    public readonly code: string | null,
    public readonly description: string | null,
    public readonly uri: string | null,
    public readonly rawBody: string,
  ) {
    super(
      OAuth2ServerError.buildMessage(statusCode, code, description, rawBody),
    );
    this.name = "OAuth2ServerError";
  }

  private static buildMessage(
    statusCode: number,
    code: string | null,
    description: string | null,
    rawBody: string,
  ): string {
    if (code === null) {
      return `Token request failed with status ${statusCode}: ${rawBody}`;
    }
    if (description !== null) {
      return `Token request failed with status ${statusCode}: ${code} -- ${description}`;
    }
    return `Token request failed with status ${statusCode}: ${code}`;
  }
}
