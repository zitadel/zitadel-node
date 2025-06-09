export class ZitadelException extends Error {
  /** Zitadel-specific numeric error code (defaults to 0). */
  protected readonly code: number;

  /**
   * @param message  A human-readable description of the error.
   * @param cause    The underlying error that triggered this one.
   * @param code     Optional Zitadel error code (default = 0).
   */
  constructor(message: string, cause?: unknown, code = 0) {
    super(message, { cause });
    this.name = 'ZitadelException';
    this.code = code;
  }

  /** Convenience getter for the Zitadel error code. */
  public getCode(): number {
    return this.code;
  }
}
