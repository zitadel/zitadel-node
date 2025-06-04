// file: src/auth/jwtbearer.ts

// Note: This class is a direct translation from the PHP structure.
// In an `openid-client` context, the grant type string 'urn:ietf:params:oauth:grant-type:jwt-bearer'
// and its parameters (like 'assertion') are typically used directly in `client.grant()` calls.
// The `AbstractGrant` functionality from 'league/oauth2-client' is not directly mapped here.

/**
 * Represents a JWT Bearer grant.
 *
 * @link https://tools.ietf.org/html/rfc7523
 */
export class JwtBearer {
  // Cannot extend AbstractGrant as it's from a different ecosystem
  /**
   * Get the grant's name.
   *
   * @returns string
   */
  protected getName(): string {
    return 'urn:ietf:params:oauth:grant-type:jwt-bearer';
  }

  /**
   * Get required parameters for this grant type.
   *
   * @returns An array of required request parameter names.
   */
  protected getRequiredRequestParameters(): string[] {
    return ['assertion'];
  }
}
