// file: src/auth/openid.ts
import * as oauth from 'oauth4webapi'; // Assuming this is how you access the library

/**
 * OpenId class is responsible for fetching and storing OIDC Authorization Server metadata.
 * It manually fetches the .well-known/openid-configuration endpoint.
 */
export class OpenId {
  private readonly issuerUrl: string;
  private _serverMetadata!: oauth.AuthorizationServer; // Using direct type from oauth4webapi
  private _hostEndpoint!: URL;
  private isInitialized = false;

  public constructor(hostname: string) {
    // hostname is the issuer URL
    if (!hostname || hostname.trim() === '') {
      throw new TypeError('Hostname (issuer URL) cannot be empty.');
    }
    let fullUrl = hostname;
    if (!/^https?:\/\//.test(hostname)) {
      fullUrl = `https://${hostname}`;
    }
    this.issuerUrl = fullUrl;
    this._hostEndpoint = new URL(this.issuerUrl);
  }

  /**
   * Asynchronously fetches and parses the OIDC server metadata.
   * This method MUST be called and awaited before accessing metadata or endpoints.
   * @throws Error if fetching or parsing fails, or if essential endpoints are missing.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    const wellKnownUrl = new URL(
      '/.well-known/openid-configuration',
      this.issuerUrl,
    ).href;

    try {
      const response = await fetch(wellKnownUrl); // Using global fetch
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Failed to fetch OpenID configuration from ${wellKnownUrl}, status: ${response.status}, body: ${errorBody}`,
        );
      }
      // Cast to the correct type from oauth4webapi
      const metadata = (await response.json()) as oauth.AuthorizationServer;

      if (!metadata.issuer) {
        throw new Error('issuer not found in OpenID configuration');
      }
      // It's good practice for metadata.issuer to match the authority it was discovered from.
      if (metadata.issuer !== this.issuerUrl) {
        console.warn(
          `Discovered issuer "${metadata.issuer}" does not exactly match authority "${this.issuerUrl}". Proceeding with discovered issuer's endpoints, but this may indicate a misconfiguration.`,
        );
      }
      if (!metadata.token_endpoint) {
        throw new Error('token_endpoint not found in OpenID configuration');
      }
      if (!metadata.authorization_endpoint) {
        throw new Error(
          'authorization_endpoint not found in OpenID configuration',
        );
      }

      this._serverMetadata = metadata;
      this.isInitialized = true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to initialize OpenId from ${wellKnownUrl}: ${message}`,
      );
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(
        'OpenId instance has not been initialized. Call and await init() first.',
      );
    }
  }

  public getServerMetadata(): oauth.AuthorizationServer {
    // Correct return type
    this.ensureInitialized();
    return this._serverMetadata;
  }

  public getHostEndpoint(): URL {
    return this._hostEndpoint;
  }

  public getTokenEndpoint(): URL {
    this.ensureInitialized();
    const endpoint = this._serverMetadata.token_endpoint;
    if (!endpoint)
      throw new Error('Token endpoint is not available in server metadata.');
    return new URL(endpoint);
  }

  public getAuthorizationEndpoint(): URL {
    this.ensureInitialized();
    const endpoint = this._serverMetadata.authorization_endpoint;
    if (!endpoint)
      throw new Error(
        'Authorization endpoint is not available in server metadata.',
      );
    return new URL(endpoint);
  }

  public getUserinfoEndpoint(): URL | undefined {
    this.ensureInitialized();
    const endpoint = this._serverMetadata.userinfo_endpoint;
    return endpoint ? new URL(endpoint) : undefined;
  }
}
