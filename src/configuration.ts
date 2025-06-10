import { HTTPHeaders } from './runtime.js';
import { NoAuthAuthenticator, Authenticator } from './auth/index.js';
import { arch, platform, version as nodeVersion } from 'process';
import { VERSION } from './version.js';

export class Configuration {
  public readonly userAgent: string;

  constructor(
    private readonly authenticator: Authenticator = new NoAuthAuthenticator(),
    private readonly configuration: {
      basePath?: string;
      headers?: HTTPHeaders;
      userAgent?: string;
    } = {},
  ) {
    this.userAgent =
      this.configuration.userAgent ??
      `zitadel-client/${VERSION} (lang=ts; lang_version=${nodeVersion}; os=${platform}; arch=${arch})`;
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
    return this.configuration.headers;
  }
}
