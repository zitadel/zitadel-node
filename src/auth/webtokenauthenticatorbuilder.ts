// file: src/auth/webtokenauthenticatorbuilder.ts
import { OAuthAuthenticatorBuilder } from './oauthauthenticatorbuilder.js';
import { WebTokenAuthenticator } from './webtokenauthenticator.js';
import { OpenId } from './openid.js';
import * as oauth from 'oauth4webapi'; // Using oauth4webapi types and functions

export class WebTokenAuthenticatorBuilder extends OAuthAuthenticatorBuilder {
  private _jwtAlgorithm: string = 'RS256';
  private jwtLifetimeSeconds: number;
  private _keyId?: string;

  // Parameters for the JWT assertion itself
  private jwtIssuer: string;
  private jwtSubject: string;
  private jwtAudience: string;
  private privateKey: string; // PEM private key for signing the assertion

  /**
   * Constructs the builder with required parameters for the JWT assertion.
   *
   * @param host The base URL for API endpoints and OpenID discovery. Also used as default JWT audience.
   * @param jwtIssuer The issuer claim for the JWT assertion.
   * @param jwtSubject The subject claim for the JWT assertion.
   * @param jwtAudience The audience claim for the JWT assertion.
   * @param privateKey The PEM-formatted private key used to sign the JWT assertion.
   */
  public constructor(
    host: string,
    jwtIssuer: string,
    jwtSubject: string,
    jwtAudience: string,
    privateKey: string,
  ) {
    super(host); // Sets this.originalHost (issuer host for OpenId)
    this.jwtIssuer = jwtIssuer;
    this.jwtSubject = jwtSubject;
    this.jwtAudience = jwtAudience; // Audience for the JWT assertion
    this.privateKey = privateKey;
    this.jwtLifetimeSeconds = 3600; // Default: 1 hour for JWT assertion lifetime
  }

  public tokenLifetimeSeconds(seconds: number): this {
    this.jwtLifetimeSeconds = seconds;
    return this;
  }

  public jwtAlgorithm(jwtAlgorithm: string): this {
    this._jwtAlgorithm = jwtAlgorithm;
    return this;
  }

  public keyId(keyId: string): this {
    this._keyId = keyId;
    return this;
  }

  /**
   * Builds and returns a new WebTokenAuthenticator instance.
   *
   * @returns A Promise resolving to a WebTokenAuthenticator instance.
   */
  public async build(): Promise<WebTokenAuthenticator> {
    // 1. Initialize OpenId to get AuthorizationServer metadata
    this.openIdInstance = new OpenId(this.originalHost);
    await this.openIdInstance.init();

    const asMetadata: oauth.AuthorizationServer =
      this.openIdInstance.getServerMetadata();

    // 2. Define ClientMetadata for oauth4webapi
    // The PHP WebTokenAuthenticatorBuilder hardcoded "zitadel" as the client_id
    // for the GenericProvider. We'll use this for our oauth.Client.
    const effectiveClientId = 'zitadel';

    const clientMetadata: oauth.Client = {
      client_id: effectiveClientId,
      // For JWT Bearer Grant (RFC 7523), the client using the grant might be public,
      // or its authentication to the token endpoint is implicit via the assertion,
      // or handled by other means if it's a confidential client.
      // Assuming 'none' for token_endpoint_auth_method for this specific setup,
      // as no client_secret was part of the original PHP WebTokenAuthenticator.
      token_endpoint_auth_method: 'none', // Explicitly setting for clarity with oauth.None()
    };

    // 3. Define ClientAuth method for oauth4webapi
    // Since the client does not use a secret for token endpoint authentication
    // in this JWT Bearer Grant scenario (auth is via the assertion itself),
    // we use oauth.None().
    const clientAuth: oauth.ClientAuth = oauth.None();

    // 4. Instantiate WebTokenAuthenticator with all parts
    return new WebTokenAuthenticator(
      this.openIdInstance,
      effectiveClientId, // client_id used in clientMetadata
      this.authScopes, // from base builder
      asMetadata,
      clientMetadata,
      clientAuth,
      // JWT-specific parameters for the assertion:
      this.jwtIssuer,
      this.jwtSubject,
      this.jwtAudience, // This is the audience for the JWT assertion
      this.privateKey,
      this.jwtLifetimeSeconds,
      this._jwtAlgorithm,
      this._keyId,
    );
  }
}
