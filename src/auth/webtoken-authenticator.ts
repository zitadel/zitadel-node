import { OAuthAuthenticator } from './oauth-authenticator.js';
import * as oauth from 'oauth4webapi';
import * as jose from 'jose';
import { OpenId } from './openid.js';
import { WebTokenAuthenticatorBuilder } from './webtoken-authenticator-builder.js';
// @ts-expect-error since it is not expoered.
import type { CryptoKey } from 'crypto';
import * as fs from 'node:fs';

/**
 * JWT-based Authenticator using the JWT Bearer Grant (RFC7523).
 *
 * This class creates a JWT assertion and exchanges it for an access token.
 */
export class WebTokenAuthenticator extends OAuthAuthenticator {
  private readonly clientAuth: oauth.ClientAuth;
  private readonly grantType: string =
    'urn:ietf:params:oauth:grant-type:jwt-bearer';

  /**
   * WebTokenAuthenticator constructor.
   *
   * @param authServer The discovered authorization server metadata.
   * @param client The OAuth2 client metadata.
   * @param scope The scope for the token request.
   * @param privateKey The private key to sign the JWT.
   * @param jwtIssuer The issuer claim for the JWT.
   * @param jwtSubject The subject claim for the JWT.
   * @param jwtAudience The audience claim for the JWT.
   * @param jwtLifetimeSeconds The lifetime of the JWT in seconds.
   * @param jwtAlgorithm The signing algorithm.
   * @param keyId The key ID.
   */
  private constructor(
    authServer: oauth.AuthorizationServer,
    client: oauth.Client,
    scope: string,
    private readonly privateKey: CryptoKey,
    private readonly jwtIssuer: string,
    private readonly jwtSubject: string,
    private readonly jwtAudience: string,
    private readonly jwtLifetimeSeconds: number,
    private readonly jwtAlgorithm: string,
    private readonly keyId?: string,
  ) {
    super(authServer, client, scope);
    this.clientAuth = oauth.None();
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
  ): Promise<WebTokenAuthenticator> {
    const json = fs.readFileSync(jsonPath, 'utf-8');
    const config = JSON.parse(json);

    const userId = config?.userId;
    const privateKey = config?.key;
    const keyId = config?.keyId;

    if (!userId || !privateKey || !keyId) {
      throw new Error('Missing required configuration keys in JSON file.');
    }

    return WebTokenAuthenticator.builder(host, userId, privateKey)
      .keyId(keyId)
      .build();
  }

  /**
   * Returns a new builder instance for WebTokenAuthenticator.
   *
   * @param host The base URL for API endpoints.
   * @param userId The user ID.
   * @param privateKey The PEM-formatted private key.
   * @returns A new builder instance.
   */
  public static builder(
    host: string,
    userId: string,
    privateKey: string,
  ): WebTokenAuthenticatorBuilder {
    return new WebTokenAuthenticatorBuilder(
      host,
      userId,
      userId,
      host,
      privateKey,
    );
  }

  /**
   * Creates an instance of WebTokenAuthenticator.
   * @internal
   */
  public static async create(
    openId: OpenId,
    clientId: string,
    scope: string,
    jwtIssuer: string,
    jwtSubject: string,
    jwtAudience: string,
    privateKeyPem: string,
    jwtLifetimeSeconds: number,
    jwtAlgorithm: string,
    keyId?: string,
  ): Promise<WebTokenAuthenticator> {
    const privateKey = await jose.importPKCS8(privateKeyPem, jwtAlgorithm);
    const authServer = openId.getAuthorizationServer();
    const client: oauth.Client = { client_id: clientId };
    return new WebTokenAuthenticator(
      authServer,
      client,
      scope,
      privateKey,
      jwtIssuer,
      jwtSubject,
      jwtAudience,
      jwtLifetimeSeconds,
      jwtAlgorithm,
      keyId,
    );
  }

  protected async performTokenRequest(
    authServer: oauth.AuthorizationServer,
    client: oauth.Client,
  ): Promise<oauth.TokenEndpointResponse> {
    const protectedHeader: jose.JWTHeaderParameters = {
      alg: this.jwtAlgorithm,
    };
    if (this.keyId) {
      protectedHeader.kid = this.keyId;
    }

    const assertion = await new jose.SignJWT({ sub: this.jwtSubject })
      .setProtectedHeader(protectedHeader)
      .setIssuer(this.jwtIssuer)
      .setAudience(
        this.jwtAudience || authServer.token_endpoint || authServer.issuer,
      )
      .setIssuedAt()
      .setExpirationTime(`${this.jwtLifetimeSeconds}s`)
      .sign(this.privateKey);

    const parameters = new URLSearchParams({
      grant_type: this.grantType,
      assertion: assertion,
      scope: this.scope,
    });

    const response = await oauth.genericTokenEndpointRequest(
      authServer,
      client,
      this.clientAuth,
      this.grantType,
      parameters,
      {
        [oauth.allowInsecureRequests]: process.env.JEST_WORKER_ID !== undefined,
      },
    );

    return oauth.processGenericTokenEndpointResponse(
      authServer,
      client,
      response,
    );
  }
}
