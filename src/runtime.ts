/* tslint:disable */
/* eslint-disable */
import { Configuration } from './configuration.js';

export const BASE_PATH = 'https://zitadel.com'.replace(/\/+$/, '');

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
    // @ts-ignore
    throw new ResponseError(response, 'Response returned an error code');
  }

  private async createFetchParams(
    context: RequestOpts,
    initOverrides?: RequestInit | InitOverrideFunction,
  ) {
    let url = this.configuration.basePath + context.path;
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

export class ResponseError extends Error {
  override name: 'ResponseError' = 'ResponseError';

  constructor(
    public response: Response,
    msg?: string,
  ) {
    super(msg);
  }
}

export class FetchError extends Error {
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

export type Json = any;
export type HTTPMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'OPTIONS'
  | 'HEAD';
export type HTTPHeaders = { [key: string]: string };
export type HTTPQuery = {
  [key: string]:
    | string
    | number
    | null
    | boolean
    | Array<string | number | null | boolean>
    | Set<string | number | null | boolean>
    | HTTPQuery;
};
export type HTTPBody = Json | FormData | URLSearchParams;
export type HTTPRequestInit = {
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

export interface RequestOpts {
  path: string;
  method: HTTPMethod;
  headers: HTTPHeaders;
  query?: HTTPQuery;
  body?: HTTPBody;
}

export function querystring(params: HTTPQuery, prefix: string = ''): string {
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
    | HTTPQuery,
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

export interface ResponseTransformer<T> {
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
