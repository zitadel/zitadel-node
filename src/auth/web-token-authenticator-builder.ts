import { createPrivateKey, type KeyObject } from "node:crypto";
import { OAuthAuthenticatorBuilder } from "./oauth-authenticator-builder.js";
import { WebTokenAuthenticator } from "./web-token-authenticator.js";
import { requireText } from "./oauth-authenticator.js";

const ALGORITHMS = ["RS256", "RS384", "RS512"];

function loadPrivateKey(pem: string): KeyObject {
  let key: KeyObject;
  try {
    key = createPrivateKey({ key: pem, format: "pem" });
  } catch (e) {
    throw new TypeError("Private key is not a valid RSA private key.", {
      cause: e,
    });
  }
  if (key.asymmetricKeyType !== "rsa") {
    throw new TypeError("Private key is not a valid RSA private key.");
  }
  return key;
}

/**
 * Builder for {@link WebTokenAuthenticator}.
 */
export class WebTokenAuthenticatorBuilder extends OAuthAuthenticatorBuilder {
  private readonly userId: string;
  private readonly privateKey: KeyObject;
  private lifetimeSeconds: number = 3600;
  private algorithm: string = "RS256";
  private kid: string | null = null;

  /**
   * @param host the base URL for the OAuth provider
   * @param userId the user ID, used as both the issuer and the subject
   * @param privateKey the PEM-encoded RSA private key used to sign the JWT
   * @throws {TypeError} if the host is not a valid http or https URL, the user
   *   ID is empty, or the key is not an RSA private key
   */
  public constructor(host: string, userId: string, privateKey: string) {
    super(host);
    this.userId = requireText(userId, "User ID");
    this.privateKey = loadPrivateKey(privateKey);
  }

  /**
   * Sets the JWT assertion lifetime in seconds.
   *
   * @param seconds the lifetime; must be a positive integer
   * @throws {RangeError} if the lifetime is not positive
   */
  public tokenLifetimeSeconds(seconds: number): this {
    if (!Number.isInteger(seconds) || seconds <= 0) {
      throw new RangeError(
        "Token lifetime must be a positive number of seconds.",
      );
    }
    this.lifetimeSeconds = seconds;
    return this;
  }

  /**
   * Sets the JWT signing algorithm.
   *
   * @param jwtAlgorithm one of RS256, RS384 or RS512
   * @throws {TypeError} if the algorithm is not supported
   */
  public jwtAlgorithm(jwtAlgorithm: string): this {
    if (!ALGORITHMS.includes(jwtAlgorithm)) {
      throw new TypeError(
        `Unsupported JWT algorithm '${jwtAlgorithm}'; use RS256, RS384 or RS512.`,
      );
    }
    this.algorithm = jwtAlgorithm;
    return this;
  }

  /**
   * Sets the key ID sent as the `kid` header of the assertion.
   *
   * @param keyId the key identifier
   * @throws {TypeError} if the key ID is empty
   */
  public keyId(keyId: string): this {
    this.kid = requireText(keyId, "Key ID");
    return this;
  }

  public build(): WebTokenAuthenticator {
    return new WebTokenAuthenticator(
      this.openId,
      this.scope,
      this.userId,
      this.userId,
      this.openId.getHostEndpoint(),
      this.privateKey,
      this.lifetimeSeconds,
      this.algorithm,
      this.kid,
    );
  }
}
