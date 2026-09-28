import * as fs from "node:fs";
import type { KeyObject } from "node:crypto";
import * as jose from "jose";
import { OAuthAuthenticator } from "./oauth-authenticator.js";
import type { OpenId } from "./open-id.js";
import { WebTokenAuthenticatorBuilder } from "./web-token-authenticator-builder.js";

/**
 * JWT-bearer authenticator using the JWT Bearer Grant (RFC 7523).
 *
 * Signs a short-lived JWT assertion with `jose` and exchanges it at the
 * provider's token endpoint for an access token. The exchange is sent through
 * the SDK's shared transport; see {@link OAuthAuthenticator} for the caching
 * and HTTP-injection contract.
 */
export class WebTokenAuthenticator extends OAuthAuthenticator {
  /**
   * @param openId the OpenID discovery helper for the target host
   * @param scope the space-delimited scope string for the token request
   * @param jwtIssuer the JWT issuer (iss) claim
   * @param jwtSubject the JWT subject (sub) claim
   * @param jwtAudience the JWT audience (aud) claim
   * @param privateKey the RSA private key used to sign the JWT
   * @param jwtLifetimeSeconds the lifetime of the JWT assertion
   * @param jwtAlgorithm the JWT signing algorithm
   * @param keyId the optional key id (kid) header
   */
  public constructor(
    openId: OpenId,
    scope: string,
    private readonly jwtIssuer: string,
    private readonly jwtSubject: string,
    private readonly jwtAudience: string,
    private readonly privateKey: KeyObject,
    private readonly jwtLifetimeSeconds: number = 3600,
    private readonly jwtAlgorithm: string = "RS256",
    private readonly keyId: string | null = null,
  ) {
    super(openId, scope);
  }

  /**
   * Creates a WebTokenAuthenticator from a Zitadel service-account key file.
   *
   * Expected JSON format:
   *
   * ```json
   * {
   *   "type": "serviceaccount",
   *   "keyId": "<key-id>",
   *   "key": "<private-key>",
   *   "userId": "<user-id>"
   * }
   * ```
   *
   * @param host the base URL for the API endpoints
   * @param jsonPath the path to the key file
   * @throws {TypeError} if the file cannot be read, is not a JSON object, lacks
   *   the string fields userId, keyId and key, or holds an invalid key
   */
  public static fromJson(
    host: string,
    jsonPath: string,
  ): WebTokenAuthenticator {
    let content: string;
    try {
      content = fs.readFileSync(jsonPath, "utf-8");
    } catch (e) {
      throw new TypeError(`Unable to read the key file at ${jsonPath}`, {
        cause: e,
      });
    }
    let config: unknown = null;
    try {
      config = JSON.parse(content);
    } catch {
      config = null;
    }
    if (
      config === null ||
      typeof config !== "object" ||
      Array.isArray(config)
    ) {
      throw new TypeError(`The key file at ${jsonPath} is not a JSON object`);
    }
    const { userId, keyId, key } = config as Record<string, unknown>;
    if (
      typeof userId !== "string" ||
      typeof keyId !== "string" ||
      typeof key !== "string"
    ) {
      throw new TypeError(
        `The key file at ${jsonPath} must contain the string fields userId, keyId and key`,
      );
    }
    return WebTokenAuthenticator.builder(host, userId, key)
      .keyId(keyId)
      .build();
  }

  /**
   * Returns a builder for a WebTokenAuthenticator.
   *
   * @param host the base URL for the OAuth provider
   * @param userId the user ID, used as both the issuer and the subject
   * @param privateKey the PEM-encoded RSA private key used to sign the JWT
   * @throws {TypeError} if the host is not a valid http or https URL, the user
   *   ID is empty, or the key is not an RSA private key
   */
  public static builder(
    host: string,
    userId: string,
    privateKey: string,
  ): WebTokenAuthenticatorBuilder {
    return new WebTokenAuthenticatorBuilder(host, userId, privateKey);
  }

  protected getGrantType(): string {
    return "urn:ietf:params:oauth:grant-type:jwt-bearer";
  }

  protected async getTokenRequestParams(): Promise<Record<string, string>> {
    const header: jose.JWTHeaderParameters = { alg: this.jwtAlgorithm };
    if (this.keyId !== null) {
      header.kid = this.keyId;
    }
    let assertion: string;
    try {
      assertion = await new jose.SignJWT({})
        .setProtectedHeader(header)
        .setIssuer(this.jwtIssuer)
        .setSubject(this.jwtSubject)
        .setAudience(this.jwtAudience)
        .setIssuedAt()
        .setExpirationTime(`${this.jwtLifetimeSeconds}s`)
        .sign(this.privateKey);
    } catch (e) {
      throw new Error("Unable to sign the JWT assertion", { cause: e });
    }
    return { assertion };
  }
}
