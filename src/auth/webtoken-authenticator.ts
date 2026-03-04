import { OAuthAuthenticator } from './oauth-authenticator.js';
import * as oauth from 'oauth4webapi';
import * as jose from 'jose';
import { OpenId } from './openid.js';
import { WebTokenAuthenticatorBuilder } from './webtoken-authenticator-builder.js';
import { TransportOptions } from '../configuration.js';
// @ts-expect-error since it is not expoered.
import type { CryptoKey } from 'crypto';
import * as fs from 'node:fs';
import { createPrivateKey, KeyObject } from 'node:crypto';

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
   * @param transportOptions Optional transport options for TLS, proxy, and headers.
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
    transportOptions?: TransportOptions,
  ) {
    super(authServer, client, scope, transportOptions);
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
    transportOptions?: TransportOptions,
  ): Promise<WebTokenAuthenticator> {
    const json = fs.readFileSync(jsonPath, 'utf-8').replaceAll('\\"', '"');
    const config = JSON.parse(json);

    const userId = config?.userId;
    const privateKey = config?.key;
    const keyId = config?.keyId;

    if (!userId || !privateKey || !keyId) {
      throw new Error('Missing required configuration keys in JSON file.');
    }

    return WebTokenAuthenticator.builder(
      host,
      userId,
      privateKey,
      transportOptions,
    )
      .keyId(keyId)
      .build();
  }

  /**
   * Returns a new builder instance for WebTokenAuthenticator.
   *
   * @param host The base URL for API endpoints.
   * @param userId The user ID.
   * @param privateKey The PEM-formatted private key.
   * @param transportOptions Optional transport options for TLS and headers.
   * @returns A new builder instance.
   */
  public static builder(
    host: string,
    userId: string,
    privateKey: string,
    transportOptions?: TransportOptions,
  ): WebTokenAuthenticatorBuilder {
    return new WebTokenAuthenticatorBuilder(
      host,
      userId,
      userId,
      host,
      privateKey,
      transportOptions,
    );
  }

  /**
   * Normalises any PKCS-1/PKCS-8 PEM string and returns a Node KeyObject.
   * Works with:
   *   • one-liner PEMs
   *   • JSON-escaped “\n” sequences
   *   • Windows CRLF line-endings
   */
  private static parsePem(pemLike: string): KeyObject {
    // 1 – turn literal “\n” into real LF and unify CRLF → LF
    let pem = pemLike.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim();

    // 2 – ensure header and footer sit on their own lines
    pem = pem
      .replace(/(-----BEGIN [^-]+-----)([A-Za-z0-9+/=]+)/, '$1\n$2')
      .replace(/([A-Za-z0-9+/=]+)(-----END [^-]+-----)/, '$1\n$2');

    // 3 – if the body is one long line, wrap it at 64 chars (tidy, not mandatory)
    const parts = pem.split('\n');
    if (parts.length === 3) {
      const [header, bodyRaw, footer] = parts;
      const bodyWrapped =
        bodyRaw
          .replace(/\s+/g, '') // strip stray white-space
          .match(/.{1,64}/g) // wrap
          ?.join('\n') ?? bodyRaw;
      pem = `${header}\n${bodyWrapped}\n${footer}`;
    }

    // 4 – pick the correct “type” hint for Node’s decoder
    const type = /BEGIN RSA PRIVATE KEY/.test(pem) ? 'pkcs1' : 'pkcs8';

    // 5 – finally build the KeyObject
    return createPrivateKey({ key: pem, format: 'pem', type });
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
    transportOptions?: TransportOptions,
  ): Promise<WebTokenAuthenticator> {
    const privateKey = WebTokenAuthenticator.parsePem(privateKeyPem);
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
      transportOptions,
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
      .setAudience(this.jwtAudience)
      .setIssuedAt()
      .setExpirationTime(`${this.jwtLifetimeSeconds}s`)
      .sign(this.privateKey);

    const parameters = new URLSearchParams({
      grant_type: this.grantType,
      assertion: assertion,
      scope: this.scope,
    });

    const tokenOptions = await this.buildTokenRequestOptions();

    // Allow insecure requests in test environments even without transport options
    if (process.env.JEST_WORKER_ID !== undefined) {
      tokenOptions[oauth.allowInsecureRequests] = true;
    }

    // noinspection JSDeprecatedSymbols
    const response = await oauth.genericTokenEndpointRequest(
      authServer,
      client,
      this.clientAuth,
      this.grantType,
      parameters,
      tokenOptions,
    );

    const responseBody = (await response.clone().json()) as Response;
    // @ts-expect-error wgsg
    const idToken = responseBody.id_token;

    if (!idToken || typeof idToken !== 'string') {
      return oauth.processGenericTokenEndpointResponse(
        authServer,
        client,
        response,
      );
    } else {
      const claims = jose.decodeJwt(idToken);

      const validationClientId = claims.azp;
      if (!validationClientId || typeof validationClientId !== 'string') {
        throw new Error(
          'ID Token is missing a valid `azp` claim for validation.',
        );
      }

      return oauth.processGenericTokenEndpointResponse(
        authServer,
        { client_id: validationClientId },
        response,
      );
    }
  }
}
