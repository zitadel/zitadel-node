export class ZitadelException extends Error {
  protected readonly code: number;

  constructor(message: string, code: number = 0, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ZitadelException';
    this.code = code;
  }

  /**
   * Gets the error code.
   * @returns The error code.
   */
  public getCode(): number {
    return this.code;
  }
}
