/* tslint:disable */
/* eslint-disable */
import { Configuration } from './configuration.js';
import { ApiException } from './api-exception.js';

/**
 * This is the base class for all generated API classes.
 */
export class BaseAPI {
  private static readonly jsonRegex = new RegExp(
    '^(:?application\/json|[^;/ \t]+\/[^;/ \t]+[+]json)[ \t]*(:?;.*)?$',
    'i',
  );

  constructor(protected configuration = new Configuration()) {
    //
  }

  /**
   * Check if the given MIME is a JSON MIME.
   * JSON MIME examples:
   *   application/json
   *   application/json; charset=UTF8
   *   APPLICATION/JSON
   *   application/vnd.company+json
   * @param mime - MIME (Multipurpose Internet Mail Extensions)
   * @return True if the given MIME is JSON, false otherwise.
   */
  protected isJsonMime(mime: string | null | undefined): boolean {
    if (!mime) {
      return false;
    }
    return BaseAPI.jsonRegex.test(mime);
  }

  protected async request(
    context: RequestOpts,
    initOverrides?: RequestInit | InitOverrideFunction,
  ): Promise<Response> {
    const { url, init } = await this.createFetchParams(context, initOverrides);
    const response = await this.fetchApi(url, init);
    if (response && response.status >= 200 && response.status < 300) {
      return response;
    }
    throw new ApiException(
      'Response returned an error code',
      response.status,
      Object.fromEntries(
        Object.entries(response.headers).map(([k, v]) => [
          k,
          Array.isArray(v) ? v : [v],
        ]),
      ),
      response?.body?.toString(),
    );
  }

  private async createFetchParams(
    context: RequestOpts,
    initOverrides?: RequestInit | InitOverrideFunction,
  ) {
    let url = new URL(context.path, this.configuration.basePath).toString();
    if (
      context.query !== undefined &&
      Object.keys(context.query).length !== 0
    ) {
      // only add the querystring to the URL if there are query parameters.
      // this is done to avoid urls ending with a "?" character which buggy webservers
      // do not handle correctly sometimes.
      url += '?' + querystring(context.query);
    }

    const headers = Object.assign(
      {},
      this.configuration.headers,
      {
        'User-Agent': this.configuration.userAgent,
      },
      context.headers,
    );
    Object.keys(headers).forEach((key) =>
      headers[key] === undefined ? delete headers[key] : {},
    );

    const initOverrideFn =
      typeof initOverrides === 'function'
        ? initOverrides
        : async () => initOverrides;

    const initParams = {
      method: context.method,
      headers,
      body: context.body,
    };

    const overriddenInit: RequestInit = {
      ...initParams,
      ...(await initOverrideFn({
        init: initParams,
        context,
      })),
    };

    let body: any;
    if (
      isFormData(overriddenInit.body) ||
      overriddenInit.body instanceof URLSearchParams ||
      isBlob(overriddenInit.body)
    ) {
      body = overriddenInit.body;
    } else if (this.isJsonMime(headers['Content-Type'])) {
      body = JSON.stringify(overriddenInit.body);
    } else {
      body = overriddenInit.body;
    }

    const init: RequestInit = {
      ...overriddenInit,
      body,
    };

    if (
      this.configuration.transportOptions?.insecure ||
      this.configuration.transportOptions?.caCertPath ||
      this.configuration.transportOptions?.proxyUrl
    ) {
      const connectOpts: Record<string, unknown> = {};
      if (this.configuration.transportOptions.insecure) {
        connectOpts.rejectUnauthorized = false;
      }
      if (this.configuration.transportOptions.caCertPath) {
        const { readFileSync } = await import('node:fs');
        const tls = await import('node:tls');
        const customCa = readFileSync(
          this.configuration.transportOptions.caCertPath,
          'utf-8',
        );
        connectOpts.ca = [...(tls.rootCertificates ?? []), customCa];
      }
      if (this.configuration.transportOptions.proxyUrl) {
        const { ProxyAgent } = await import('undici');
        const proxyOpts: { uri: string; requestTls?: Record<string, unknown> } =
          {
            uri: this.configuration.transportOptions.proxyUrl,
          };
        if (Object.keys(connectOpts).length > 0) {
          proxyOpts.requestTls = connectOpts;
        }
        (init as any).dispatcher = new ProxyAgent(proxyOpts);
      } else {
        const { Agent } = await import('undici');
        (init as any).dispatcher = new Agent({ connect: connectOpts });
      }
    }

    return { url, init };
  }

  private fetchApi = async (url: string, init: RequestInit) => {
    let fetchParams = { url, init };
    let response: Response | undefined = undefined;
    try {
      response = await fetch(fetchParams.url, fetchParams.init);
    } catch (e) {
      if (response === undefined) {
        if (e instanceof Error) {
          throw new FetchError(
            e,
            'The request failed and the interceptors did not return an alternative response',
          );
        } else {
          throw e;
        }
      }
    }
    return response;
  };
}

function isBlob(value: any): value is Blob {
  return typeof Blob !== 'undefined' && value instanceof Blob;
}

function isFormData(value: any): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}
class FetchError extends Error {
  override name: 'FetchError' = 'FetchError';

  constructor(
    public cause: Error,
    msg?: string,
  ) {
    super(msg);
  }
}

export class RequiredError extends Error {
  override name: 'RequiredError' = 'RequiredError';

  constructor(
    public field: string,
    msg?: string,
  ) {
    super(msg);
  }
}

export const COLLECTION_FORMATS = {
  csv: ',',
  ssv: ' ',
  tsv: '\t',
  pipes: '|',
};

type Json = any;
type HTTPMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'OPTIONS'
  | 'HEAD';
export type HTTPHeaders = { [key: string]: string };
type HTTPQuery = {
  [key: string]:
    | string
    | number
    | null
    | boolean
    | Array<string | number | null | boolean>
    | Set<string | number | null | boolean>
    | HTTPQuery;
};
type HTTPBody = Json | FormData | URLSearchParams;
type HTTPRequestInit = {
  headers?: HTTPHeaders;
  method: HTTPMethod;
  // @ts-ignore
  credentials?: RequestCredentials;
  body?: HTTPBody;
};

export type InitOverrideFunction = (requestContext: {
  init: HTTPRequestInit;
  context: RequestOpts;
}) => Promise<RequestInit>;

interface RequestOpts {
  path: string;
  method: HTTPMethod;
  headers: HTTPHeaders;
  query?: HTTPQuery;
  body?: HTTPBody;
}

function querystring(params: HTTPQuery, prefix: string = ''): string {
  return Object.keys(params)
    .map((key) => querystringSingleKey(key, params[key], prefix))
    .filter((part) => part.length > 0)
    .join('&');
}

function querystringSingleKey(
  key: string,
  value:
    | string
    | number
    | null
    | undefined
    | boolean
    | Array<string | number | null | boolean>
    | Set<string | number | null | boolean>
    | HTTPQuery
    | Date,
  keyPrefix: string = '',
): string {
  const fullKey = keyPrefix + (keyPrefix.length ? `[${key}]` : key);
  if (value instanceof Array) {
    const multiValue = value
      .map((singleValue) => encodeURIComponent(String(singleValue)))
      .join(`&${encodeURIComponent(fullKey)}=`);
    return `${encodeURIComponent(fullKey)}=${multiValue}`;
  }
  if (value instanceof Set) {
    const valueAsArray = Array.from(value);
    return querystringSingleKey(key, valueAsArray, keyPrefix);
  }
  if (value instanceof Date) {
    return `${encodeURIComponent(fullKey)}=${encodeURIComponent(value.toISOString())}`;
  }
  // noinspection SuspiciousTypeOfGuard
  if (value instanceof Object) {
    return querystring(value as HTTPQuery, fullKey);
  }
  return `${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`;
}

export function mapValues(data: any, fn: (item: any) => any) {
  return Object.keys(data).reduce(
    (acc, key) => ({ ...acc, [key]: fn(data[key]) }),
    {},
  );
}

export interface ApiResponse<T> {
  raw: Response;

  value(): Promise<T>;
}

interface ResponseTransformer<T> {
  (json: any): T;
}

export class JSONApiResponse<T> {
  constructor(
    public raw: Response,
    private transformer: ResponseTransformer<T> = (jsonValue: any) => jsonValue,
  ) {}

  async value(): Promise<T> {
    return this.transformer(await this.raw.json());
  }
}
