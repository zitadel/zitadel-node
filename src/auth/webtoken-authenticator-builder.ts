import { OAuthAuthenticatorBuilder } from './oauth-authenticator-builder.js';
import { WebTokenAuthenticator } from './webtoken-authenticator.js';
import { TransportOptions } from '../configuration.js';

/**
 * Builder for WebTokenAuthenticator.
 *
 * Provides a fluent API for configuring and constructing a
 * WebTokenAuthenticator. This builder extends the base
 * OAuthAuthenticatorBuilder.
 *
 * Usage:
 * ```
 * const authenticator = await WebTokenAuthenticator
 * .builder("[https://api.example.com](https://api.example.com)", "issuer", "subject", "audience", privateKey)
 * .scopes(["openid", "foo"])
 * .tokenLifetimeSeconds(3600)
 * .jwtAlgorithm("RS256")
 * .build();
 * ```
 *
 * A convenience method "fromJson" is provided to create the builder using a
 * service account JSON file.
 */
export class WebTokenAuthenticatorBuilder extends OAuthAuthenticatorBuilder {
  private jwtAlg: string = 'RS256';
  private lifetimeSeconds: number = 3600;
  private kid?: string;

  /**
   * Constructs the builder with required parameters.
   *
   * @param host The base URL for API endpoints.
   * @param jwtIssuer The issuer claim for the JWT.
   * @param jwtSubject The subject claim for the JWT.
   * @param jwtAudience The audience claim for the JWT.
   * @param privateKey The PEM-formatted private key used to sign the JWT.
   * @param transportOptions Optional transport options for TLS and headers.
   */
  public constructor(
    host: string,
    private readonly jwtIssuer: string,
    private readonly jwtSubject: string,
    private readonly jwtAudience: string,
    private readonly privateKey: string,
    transportOptions?: TransportOptions,
  ) {
    super(host, transportOptions);
  }

  /**
   * Sets the token lifetime in seconds.
   *
   * @param seconds The lifetime of the JWT in seconds.
   * @returns The builder instance for chaining.
   */
  public tokenLifetimeSeconds(seconds: number): this {
    this.lifetimeSeconds = seconds;
    return this;
  }

  /**
   * Sets the JWT signing algorithm.
   *
   * @param algorithm The JWT signing algorithm (e.g., "RS256").
   * @returns The builder instance for chaining.
   */
  public jwtAlgorithm(algorithm: string): this {
    this.jwtAlg = algorithm;
    return this;
  }

  /**
   * Sets the Key ID (kid) for the JWT header.
   *
   * @param keyId The Key ID.
   * @returns The builder instance for chaining.
   */
  public keyId(keyId: string): this {
    this.kid = keyId;
    return this;
  }

  /**
   * Builds and returns a new WebTokenAuthenticator instance.
   *
   * Generates a JWT assertion using the provided parameters and then
   * constructs a WebTokenAuthenticator.
   *
   * @returns The constructed WebTokenAuthenticator.
   * @throws {Error} if JWT generation fails.
   */
  public async build(): Promise<WebTokenAuthenticator> {
    await this.discoverOpenId();
    return WebTokenAuthenticator.create(
      this.openId,
      'zitadel',
      this.authScopes,
      this.jwtIssuer,
      this.jwtSubject,
      this.jwtAudience,
      this.privateKey,
      this.lifetimeSeconds,
      this.jwtAlg,
      this.kid,
    );
  }
}
