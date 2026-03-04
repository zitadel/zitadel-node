import { HTTPHeaders } from './runtime.js';
import { NoAuthAuthenticator, Authenticator } from './auth/index.js';
import { arch, platform, version as nodeVersion } from 'process';
import { VERSION } from './version.js';

export interface TransportOptions {
  defaultHeaders?: Record<string, string>;
  caCertPath?: string;
  insecure?: boolean;
  proxyUrl?: string;
}

/**
 * Builds an undici dispatcher (Agent or ProxyAgent) from transport options.
 *
 * Returns undefined if no custom TLS or proxy settings are needed.
 */
export async function buildDispatcher(
  transportOptions?: TransportOptions,
): Promise<unknown | undefined> {
  if (
    !transportOptions?.insecure &&
    !transportOptions?.caCertPath &&
    !transportOptions?.proxyUrl
  ) {
    return undefined;
  }

  const connectOpts: Record<string, unknown> = {};
  if (transportOptions.insecure) {
    connectOpts.rejectUnauthorized = false;
  }
  if (transportOptions.caCertPath) {
    const { readFileSync } = await import('node:fs');
    const tls = await import('node:tls');
    const customCa = readFileSync(transportOptions.caCertPath, 'utf-8');
    connectOpts.ca = [...(tls.rootCertificates ?? []), customCa];
  }
  if (transportOptions.proxyUrl) {
    const { ProxyAgent } = await import('undici');
    const proxyOpts: { uri: string; requestTls?: Record<string, unknown> } = {
      uri: transportOptions.proxyUrl,
    };
    if (Object.keys(connectOpts).length > 0) {
      proxyOpts.requestTls = connectOpts;
    }
    return new ProxyAgent(proxyOpts);
  } else {
    const { Agent } = await import('undici');
    return new Agent({ connect: connectOpts });
  }
}

export class Configuration {
  public readonly userAgent: string;

  constructor(
    private readonly authenticator: Authenticator = new NoAuthAuthenticator(),
    private readonly configuration: {
      basePath?: string;
      headers?: HTTPHeaders;
      userAgent?: string;
      transportOptions?: TransportOptions;
    } = {},
  ) {
    this.userAgent =
      this.configuration.userAgent ??
      `zitadel-client/${VERSION} (lang=ts; lang_version=${nodeVersion}; os=${platform}; arch=${arch})`;
    if (this.configuration.transportOptions?.defaultHeaders) {
      Object.freeze(this.configuration.transportOptions.defaultHeaders);
    }
  }

  get basePath(): string {
    return this.authenticator.getHost().toString();
  }

  get accessToken(): (
    name?: string,
    scopes?: string[],
  ) => string | Promise<string> {
    return async () => this.authenticator.getAuthToken();
  }

  get headers(): HTTPHeaders | undefined {
    return {
      ...this.configuration.transportOptions?.defaultHeaders,
      ...this.configuration.headers,
    };
  }

  get transportOptions(): TransportOptions | undefined {
    return this.configuration.transportOptions;
  }
}
