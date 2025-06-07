import { OAuthAuthenticatorBuilder } from './oauth-authenticator-builder.js';
import { WebTokenAuthenticator } from './webtoken-authenticator.js';
import { promises as fs } from 'fs';

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
   */
  public constructor(
    host: string,
    private readonly jwtIssuer: string,
    private readonly jwtSubject: string,
    private readonly jwtAudience: string,
    private readonly privateKey: string,
  ) {
    super(host);
  }

  /**
   * Initialize a WebTokenAuthenticator instance from a JSON configuration
   * file.
   *
   * The JSON file should have the following structure:
   * ```
   * {
   * "type": "serviceaccount",
   * "keyId": "100509901696068329",
   * "key": "-----BEGIN RSA PRIVATE KEY----- [...] -----END RSA PRIVATE KEY-----\n",
   * "userId": "100507859606888466"
   * }
   * ```
   *
   * @param host The base URL for the API endpoints.
   * @param jsonPath The file path to the JSON configuration file.
   * @returns A builder instance for WebTokenAuthenticator.
   * @throws {Error} if the file cannot be read or the JSON is invalid.
   */
  public static async fromJson(
    host: string,
    jsonPath: string,
  ): Promise<WebTokenAuthenticatorBuilder> {
    const json = await fs.readFile(jsonPath, 'utf-8');
    const config = JSON.parse(json);

    const userId = config?.userId;
    const privateKey = config?.key;
    const keyId = config?.keyId;

    if (!userId || !privateKey || !keyId) {
      throw new Error('Missing required configuration keys in JSON file.');
    }

    const builder = new WebTokenAuthenticatorBuilder(
      host,
      userId,
      userId,
      host,
      privateKey,
    );
    builder.keyId(keyId);
    return builder;
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
