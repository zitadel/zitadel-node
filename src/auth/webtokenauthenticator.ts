// file: src/auth/webtokenauthenticator.ts
import { OpenId } from './openid.js';
import { OAuthAuthenticator } from './oauthauthenticator.js';
import * as oauth from 'oauth4webapi';
import * as fs from 'fs';
import { ZitadelException } from '../zitadel_exception.js';
import type { WebTokenAuthenticatorBuilder } from './webtokenauthenticatorbuilder.js';
import { WebTokenAuthenticatorBuilder as ActualWebTokenAuthenticatorBuilder } from './webtokenauthenticatorbuilder.js';

// Import necessary functions and types from 'jose'
import {
  type CryptoKey as JoseCryptoKey,
  importPKCS8,
  type KeyObject as JoseKeyObject,
  SignJWT,
} from 'jose';

interface ServiceAccountKey {
  type: string;
  keyId: string;
  key: string;
  userId: string;
}

export class WebTokenAuthenticator extends OAuthAuthenticator {
  private static readonly GRANT_TYPE =
    'urn:ietf:params:oauth:grant-type:jwt-bearer';

  private jwtIssuer: string;
  private jwtSubject: string;
  private jwtAudience: string;
  private privateKeyPem: string;
  private jwtLifetimeMs: number;
  private jwtAlgorithm: string;
  private keyId?: string;
  // Store the key object that jose can use, using the explicitly exported types
  private josePrivateKey?: JoseKeyObject | JoseCryptoKey | Uint8Array;

  public constructor(
    openId: OpenId,
    clientId: string,
    scope: string,
    asMetadata: oauth.AuthorizationServer,
    clientMetadata: oauth.Client,
    clientAuth: oauth.ClientAuth,
    jwtIssuer: string,
    jwtSubject: string,
    jwtAudience: string,
    privateKeyPem: string,
    jwtLifetimeInSeconds: number,
    jwtAlgorithm: string = 'RS256',
    keyId?: string,
  ) {
    super(openId, clientId, scope, asMetadata, clientMetadata, clientAuth);
    this.jwtIssuer = jwtIssuer;
    this.jwtSubject = jwtSubject;
    this.jwtAudience = jwtAudience;
    this.privateKeyPem = privateKeyPem;
    this.jwtLifetimeMs = jwtLifetimeInSeconds * 1000;
    this.jwtAlgorithm = jwtAlgorithm;
    this.keyId = keyId;
  }

  private async getJosePrivateKey(): Promise<
    JoseKeyObject | JoseCryptoKey | Uint8Array
  > {
    if (this.josePrivateKey) {
      return this.josePrivateKey;
    }
    try {
      // importPKCS8 returns Promise<KeyObject | CryptoKey | Uint8Array>
      // where KeyObject and CryptoKey are the types defined/exported by jose
      this.josePrivateKey = await importPKCS8(
        this.privateKeyPem,
        this.jwtAlgorithm,
      );
      return this.josePrivateKey;
    } catch (keyImportError: unknown) {
      throw new ZitadelException(
        `Failed to import private key for JWT signing: ${(keyImportError as Error).message}. Ensure key is PKCS#8 PEM format and algorithm is correct.`,
        { cause: keyImportError },
      );
    }
  }

  public static async fromJson(
    host: string,
    jsonPath: string,
  ): Promise<WebTokenAuthenticator> {
    let jsonContent: string;
    try {
      jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    } catch (err) {
      throw new ZitadelException(
        `Unable to read JSON file: ${jsonPath}. Error: ${(err as Error).message}`,
        { cause: err },
      );
    }

    let configFromFile: Partial<ServiceAccountKey>;
    try {
      configFromFile = JSON.parse(jsonContent);
    } catch (err) {
      throw new ZitadelException(
        `Invalid JSON in file: ${jsonPath}. Error: ${(err as Error).message}`,
        { cause: err },
      );
    }

    const userId = configFromFile.userId;
    const privateKey = configFromFile.key;
    const keyId = configFromFile.keyId;

    if (!userId || !privateKey || !keyId) {
      throw new ZitadelException(
        'Missing required configuration keys (userId, key, keyId) in JSON file.',
      );
    }

    const builder = WebTokenAuthenticator.builder(
      // Corrected to call static method on WebTokenAuthenticator
      host,
      userId,
      privateKey,
    );
    builder.keyId(keyId);
    return builder.build();
  }

  public static builder(
    host: string,
    userId: string,
    privateKey: string,
  ): WebTokenAuthenticatorBuilder {
    return new ActualWebTokenAuthenticatorBuilder(
      host,
      userId,
      userId,
      host,
      privateKey,
    );
  }

  protected getGrantType(): string {
    return WebTokenAuthenticator.GRANT_TYPE;
  }

  protected async getAccessTokenOptions(): Promise<Record<string, string>> {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expirationSeconds = nowSeconds + this.jwtLifetimeMs / 1000;

    const signingKey = await this.getJosePrivateKey(); // is JoseKeyObject | JoseCryptoKey | Uint8Array

    const jwtSigner = new SignJWT({})
      .setProtectedHeader({ alg: this.jwtAlgorithm, kid: this.keyId })
      .setIssuedAt(nowSeconds)
      .setIssuer(this.jwtIssuer)
      .setSubject(this.jwtSubject)
      .setAudience(this.jwtAudience)
      .setExpirationTime(expirationSeconds);

    const assertion = await jwtSigner.sign(signingKey);

    return {
      scope: this.scope,
      assertion: assertion,
    };
  }
}
