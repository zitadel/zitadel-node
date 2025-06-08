import { ZitadelException } from './zitadel-exception.js';

/**
 * Represents an HTTP error returned from an API.
 * Exposes the HTTP status code, response headers, and response body.
 */
export class ApiException extends ZitadelException {
  /**
   * The HTTP body of the server response.
   * Can be a decoded JSON object, a string, or null.
   */
  protected readonly _responseBody: Record<string, unknown> | string | null;

  /**
   * The HTTP headers of the server response.
   * Represented as a record where keys are header names and values are arrays of strings
   * (to accommodate headers that can appear multiple times).
   */
  protected readonly _responseHeaders: Record<string, string[]>;

  /**
   * Constructor.
   *
   * @param message Error message.
   * @param code HTTP status code. This will be passed to ZitadelException's constructor.
   * @param responseHeaders HTTP response headers. Defaults to an empty object.
   * @param responseBody HTTP response body (decoded JSON object, string, or null). Defaults to null.
   */
  public constructor(
    message: string,
    code: number,
    responseHeaders: Record<string, string[]> = {},
    responseBody: Record<string, unknown> | string | null = null,
  ) {
    super(message, code);
    this._responseHeaders = responseHeaders;
    this._responseBody = responseBody;
  }

  /**
   * Gets the HTTP status code.
   *
   * @returns HTTP status code.
   */
  public getStatusCode(): number {
    return super.getCode();
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
   * Gets the HTTP response body (decoded JSON object, string, or null).
   *
   * @returns HTTP response body.
   */
  public getResponseBody(): Record<string, unknown> | string | null {
    return this._responseBody;
  }
}
