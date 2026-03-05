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
  private readonly configuration: {
    basePath?: string;
    headers?: HTTPHeaders;
    userAgent?: string;
    transportOptions?: TransportOptions;
  };
  private cachedDispatcher: Promise<Dispatcher | undefined> | null = null;

  constructor(
    private readonly authenticator: Authenticator = new NoAuthAuthenticator(),
    configuration: {
      basePath?: string;
      headers?: HTTPHeaders;
      userAgent?: string;
      transportOptions?: TransportOptions;
    } = {},
  ) {
    this.configuration = {
      ...configuration,
      transportOptions: configuration.transportOptions
        ? {
            ...configuration.transportOptions,
            defaultHeaders: configuration.transportOptions.defaultHeaders
              ? Object.freeze({
                  ...configuration.transportOptions.defaultHeaders,
                })
              : undefined,
          }
        : undefined,
    };
    this.userAgent =
      this.configuration.userAgent ??
      `zitadel-client/${VERSION} (lang=ts; lang_version=${nodeVersion}; os=${platform}; arch=${arch})`;
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
    const transportHeaders =
      this.configuration.transportOptions?.defaultHeaders;
    const configHeaders = this.configuration.headers;
    if (!transportHeaders && !configHeaders) {
      return undefined;
    }
    return { ...transportHeaders, ...configHeaders };
  }

  get transportOptions(): TransportOptions | undefined {
    return this.configuration.transportOptions;
  }
}
