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
