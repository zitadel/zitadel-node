import { ZitadelException } from './zitadel-exception.js';

/**
 * Represents an HTTP error returned from the Zitadel API.
 *
 * Exposes the HTTP status code, response headers, and response body.
 */
export class ApiException extends ZitadelException {
  /**
   * HTTP response headers.
   */
  private readonly _responseHeaders: Record<string, string[]>;

  /**
   * HTTP response body.
   */
  private readonly _responseBody: string | null;

  /**
   * Constructor.
   *
   * @param code            HTTP status code
   * @param responseHeaders HTTP response headers
   * @param responseBody    HTTP response body
   */
  public constructor(
    code: number,
    responseHeaders: Record<string, string[]>,
    responseBody: string | null,
  ) {
    super(`Error ${code}`, undefined, code);
    this._responseHeaders = responseHeaders;
    this._responseBody = responseBody;
  }

  /**
   * Gets the HTTP response headers.
   *
   * @returns HTTP response headers.
   */
  public getResponseHeaders(): Record<string, string[]> {
    return this._responseHeaders;
  }

  /**
   * Gets the HTTP response body.
   *
   * @returns HTTP response body.
   */
  public getResponseBody(): string | null {
    return this._responseBody;
  }
}
