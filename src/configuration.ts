import type { Dispatcher } from 'undici';
import { HTTPHeaders } from './runtime.js';
import { NoAuthAuthenticator, Authenticator } from './auth/index.js';
import { arch, platform, version as nodeVersion } from 'process';
import { VERSION } from './version.js';
import { buildDispatcher, type TransportOptions } from './transport-options.js';

export type { TransportOptions } from './transport-options.js';
export { buildDispatcher } from './transport-options.js';

export class Configuration {
  public readonly userAgent: string;
  private cachedDispatcher: Promise<Dispatcher | undefined> | null = null;

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

  /**
   * Returns the cached dispatcher, building it lazily on first access.
   */
  getDispatcher(): Promise<Dispatcher | undefined> {
    if (this.cachedDispatcher === null) {
      this.cachedDispatcher = buildDispatcher(
        this.configuration.transportOptions,
      );
    }
    return this.cachedDispatcher;
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
