import { ZitadelError } from "./zitadel-error.js";

/**
 * Error for an OAuth2 token endpoint that answered 2xx with a body the SDK
 * cannot use: not a JSON object, or without a non-empty `access_token`.
 */
export class OAuth2TokenError extends ZitadelError {
  constructor(message: string) {
    super(message);
    this.name = "OAuth2TokenError";
  }
}
