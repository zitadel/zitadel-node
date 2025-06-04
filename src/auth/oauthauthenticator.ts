// file: src/auth/oauthauthenticator.ts
import { OpenId } from './openid.js';
import { Authenticator } from './authenticator.js';
import { ZitadelException } from '../zitadel_exception.js';
import * as oauth from 'oauth4webapi'; // Using direct oauth4webapi types

interface StoredTokenInfo {
  response: oauth.TokenEndpointResponse;
  grantedAt: number; // Timestamp (seconds UTC) when the token was granted
  expiresAt: number | null; // Calculated expiry timestamp (seconds UTC), null if no expires_in
}

/**
 * Abstract base class for OAuth-based authenticators using the oauth4webapi library.
 */
export abstract class OAuthAuthenticator extends Authenticator {
  protected openId: OpenId; // Assumed to be initialized
  // These will be used by subclasses to construct clientMetadata and clientAuth
  protected clientId: string;
  protected scope: string;

  // These will be created by subclasses and are needed for oauth4webapi calls
  protected asMetadata!: oauth.AuthorizationServer;
  protected clientMetadata!: oauth.Client;
  protected clientAuth!: oauth.ClientAuth;

  protected tokenInfo: StoredTokenInfo | null = null;

  /**
   * OAuthAuthenticator constructor.
   * Subclasses are responsible for fetching openId.getServerMetadata() and
   * creating their specific clientMetadata and clientAuth function, then passing them here.
   */
  public constructor(
    openId: OpenId, // Must be initialized by the time asMetadata is accessed
    clientId: string,
    scope: string,
    asMetadata: oauth.AuthorizationServer,
    clientMetadata: oauth.Client,
    clientAuth: oauth.ClientAuth,
  ) {
    super(openId.getHostEndpoint().href);
    this.openId = openId;
    this.clientId = clientId; // Stored for reference, but also part of clientMetadata
    this.scope = scope;
    this.asMetadata = asMetadata;
    this.clientMetadata = clientMetadata;
    this.clientAuth = clientAuth;
  }

  protected isTokenExpired(): boolean {
    if (!this.tokenInfo) {
      return true;
    }
    if (this.tokenInfo.expiresAt === null) {
      // No expires_in: assume non-expiring or manage with other policy.
      return false;
    }
    return Math.floor(Date.now() / 1000) >= this.tokenInfo.expiresAt - 30; // 30s buffer
  }

  public async getAuthToken(): Promise<string> {
    if (this.isTokenExpired()) {
      await this.refreshToken();
    }
    if (!this.tokenInfo || !this.tokenInfo.response.access_token) {
      throw new ZitadelException('Failed to obtain a valid access token.');
    }
    return this.tokenInfo.response.access_token;
  }

  /**
   * Refreshes the access token.
   * Note: oauth4webapi has specific functions for each grant type's request & response processing.
   * This generic refreshToken will use genericTokenEndpointRequest and processGenericTokenEndpointResponse.
   * Subclasses could override this to use more specific functions if desired for stricter processing.
   */
  public async refreshToken(): Promise<oauth.TokenEndpointResponse> {
    try {
      const grantType = this.getGrantType();
      const accessTokenOptions = await this.getAccessTokenOptions();

      const parameters: Record<string, string> = {};
      for (const [key, value] of Object.entries(accessTokenOptions)) {
        parameters[key] = value;
      }

      const grantedAtSeconds = Math.floor(Date.now() / 1000);

      // DPoPOptions and other HttpRequestOptions can be prepared here if needed
      const requestOptions: oauth.TokenEndpointRequestOptions = {
        // additionalParameters: new URLSearchParams(parameters), // Not quite, genericTokenEndpointRequest takes parameters directly
        // DPoP: this.dpopHandle, // if DPoP is used
      };

      // 1. Make the request
      const response = await oauth.genericTokenEndpointRequest(
        this.asMetadata,
        this.clientMetadata,
        this.clientAuth,
        grantType,
        parameters, // oauth4webapi accepts Record<string,string> or URLSearchParams
        requestOptions,
      );

      // 2. Process the response
      // JWEDecryptOptions can be added if JWEs are expected
      const jweDecryptOptions: oauth.JWEDecryptOptions | undefined = undefined;
      const tokenResponse = await oauth.processGenericTokenEndpointResponse(
        this.asMetadata,
        this.clientMetadata,
        response,
        jweDecryptOptions,
      );

      if (!tokenResponse || !tokenResponse.access_token) {
        throw new Error('Token response did not include an access_token.');
      }

      let expiresAtSeconds: number | null = null;
      if (
        typeof tokenResponse.expires_in === 'number' &&
        tokenResponse.expires_in > 0
      ) {
        expiresAtSeconds = grantedAtSeconds + tokenResponse.expires_in;
      }

      this.tokenInfo = {
        response: tokenResponse,
        grantedAt: grantedAtSeconds,
        expiresAt: expiresAtSeconds,
      };

      return tokenResponse;
    } catch (e: unknown) {
      this.tokenInfo = null;
      let message = e instanceof Error ? e.message : String(e);
      if (e instanceof oauth.ResponseBodyError) {
        message = `Token refresh failed (ResponseBodyError): ${e.message} (status: ${e.response.status}, body})`;
      } else if (e instanceof oauth.WWWAuthenticateChallengeError) {
        message = `Token refresh failed (WWWAuthenticateChallengeError): ${e.message}`;
      }
      throw new ZitadelException(`Token refresh failed: ${message}`, {
        cause: e,
      });
    }
  }

  public getCurrentTokenResponse(): oauth.TokenEndpointResponse | null {
    return this.tokenInfo ? this.tokenInfo.response : null;
  }

  protected abstract getGrantType(): string;

  protected abstract getAccessTokenOptions():
    | Promise<Record<string, string>>
    | Record<string, string>;
}
