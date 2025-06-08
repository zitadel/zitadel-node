import { BASE_PATH, HTTPHeaders } from './runtime.js';
import { NoAuthAuthenticator } from './auth/noauth-authenticator.js';
import { Authenticator } from './auth/authenticator.js';

export class Configuration {
  constructor(
    private readonly authenticator: Authenticator = new NoAuthAuthenticator(),
    private readonly configuration: {
      basePath?: string;
      headers?: HTTPHeaders;
    } = {},
  ) {
    //
  }

  get basePath(): string {
    return this.configuration.basePath != null
      ? this.configuration.basePath
      : BASE_PATH;
  }

  get accessToken():
    | ((name?: string, scopes?: string[]) => string | Promise<string>)
    | undefined {
    return async () => this.authenticator.getAuthToken();
  }

  get headers(): HTTPHeaders | undefined {
    return this.configuration.headers;
  }
}
