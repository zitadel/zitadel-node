// noinspection ES6PreferShortImport
import { inspect } from "util";
import type { ApiClient } from "../../src/api-client.js";
import type { ApiHttpResponse } from "../../src/api-http-response.js";
import { ApiError } from "../../src/api-error.js";
import { ClientCredentialsAuthenticator } from "../../src/auth/client-credentials-authenticator.js";
import { OpenId } from "../../src/auth/open-id.js";
import { DefaultApiClient } from "../../src/default-api-client.js";
import { InternalServerError } from "../../src/errors/internal-server-error.js";
import { NetworkError } from "../../src/errors/network-error.js";
import { NotFoundError } from "../../src/errors/not-found-error.js";
import { OAuth2ServerError } from "../../src/errors/oauth2-server-error.js";
import { OAuth2TokenError } from "../../src/errors/oauth2-token-error.js";
import { ZitadelError } from "../../src/errors/zitadel-error.js";
import { SerializationError } from "../../src/object-serializer.js";
import { TransportOptions } from "../../src/transport-options.js";
import { withOauthContainer } from "./oauth-authenticator-test.js";

const HOST = "https://zitadel.example.com";
const DISCOVERY = JSON.stringify({
  issuer: HOST,
  token_endpoint: `${HOST}/oauth/v2/token`,
});

/** An ApiClient that records token requests and answers with canned responses. */
class StubApiClient implements ApiClient {
  public readonly bodies: string[] = [];

  constructor(
    private readonly discovery: ApiHttpResponse,
    private readonly token: ApiHttpResponse,
  ) {}

  sendRequest(
    _method: string,
    url: string,
    _headers: Record<string, string>,
    body: string | Buffer | Record<string, unknown> | null,
  ): Promise<ApiHttpResponse> {
    if (url.endsWith("/.well-known/openid-configuration")) {
      return Promise.resolve(this.discovery);
    }
    this.bodies.push(String(body));
    return Promise.resolve(this.token);
  }
}

const response = (statusCode: number, body: string): ApiHttpResponse => ({
  statusCode,
  body,
  headers: {},
});

const stubbed = (
  apiClient: ApiClient,
  host: string = HOST,
): ClientCredentialsAuthenticator => {
  const authenticator = ClientCredentialsAuthenticator.builder(
    host,
    "client-1",
    "client-secret",
  ).build();
  authenticator.setApiClient(apiClient);
  return authenticator;
};

const tokenStubbed = (
  status: number,
  body: string,
): ClientCredentialsAuthenticator =>
  stubbed(new StubApiClient(response(200, DISCOVERY), response(status, body)));

/** Returns what the promise rejects with, failing when it resolves. */
const rejection = async (promise: Promise<unknown>): Promise<unknown> => {
  try {
    await promise;
  } catch (e) {
    return e;
  }
  throw new Error("Expected the promise to reject");
};

/** Returns what the callback throws, failing when it returns. */
const thrown = (action: () => unknown): unknown => {
  try {
    action();
  } catch (e) {
    return e;
  }
  throw new Error("Expected the call to throw");
};

/**
 * Tests for the ClientCredentialsAuthenticator and the OAuth contract it shares
 * with every OAuth authenticator: host validation, OpenID discovery failures
 * and token endpoint failures.
 *
 * No contract test reaches a real host. HTTP-level cases use an in-memory
 * ApiClient that answers with canned responses; the transport case uses the
 * real DefaultApiClient against a local port nothing listens on.
 */
describe("ClientCredentialsAuthenticatorTest", () => {
  withOauthContainer((getOauthHost) => {
    test("testRefreshToken", async () => {
      const oauthHost = getOauthHost();
      const authenticator = ClientCredentialsAuthenticator.builder(
        oauthHost,
        "dummy-client",
        "dummy-secret",
      )
        .scopes("openid", "foo")
        .build();
      authenticator.setApiClient(
        new DefaultApiClient(TransportOptions.builder().build()),
      );

      expect(await authenticator.getAuthToken()).not.toBeFalsy();
      const token = await authenticator.refreshToken();
      expect(token).not.toBeFalsy();
      expect(await authenticator.getAuthHeadersAsync()).toEqual({
        Authorization: `Bearer ${token}`,
      });
      expect(token).toBe(await authenticator.getAuthToken());
      expect(authenticator.getHost()).toBe(oauthHost);
      expect(await authenticator.refreshToken()).not.toEqual(
        await authenticator.refreshToken(),
      );
    }, 40000);
  });

  it("redacts secrets in inspect and JSON output", () => {
    const secret = "super-secret-client-secret";
    const auth = new ClientCredentialsAuthenticator(
      new OpenId("https://api.example.com"),
      "visible-client-id",
      secret,
    );

    const inspected = inspect(auth);
    const serialised = JSON.stringify(auth);

    expect(inspected).not.toContain(secret);
    expect(inspected).toContain("***");
    expect(inspected).toContain("visible-client-id");
    expect(serialised).not.toContain(secret);
    expect(serialised).toContain("***");
    expect(serialised).toContain("visible-client-id");
  });

  it("redacts the cached access token", async () => {
    const accessToken = "super-secret-access-token";
    const auth = tokenStubbed(
      200,
      JSON.stringify({ access_token: accessToken }),
    );
    await auth.getAuthToken();

    expect(inspect(auth)).not.toContain(accessToken);
    expect(JSON.stringify(auth)).not.toContain(accessToken);
    expect(inspect(auth)).toContain("accessToken=***");
  });

  it("mints and caches the token", async () => {
    const apiClient = new StubApiClient(
      response(200, DISCOVERY),
      response(
        200,
        JSON.stringify({ access_token: "t0k3n", expires_in: 3600 }),
      ),
    );
    const auth = stubbed(apiClient);

    expect(await auth.getAuthToken()).toBe("t0k3n");
    expect(await auth.getAuthHeadersAsync()).toEqual({
      Authorization: "Bearer t0k3n",
    });
    expect(apiClient.bodies).toHaveLength(1);
    expect(
      apiClient.bodies[0].startsWith(
        "grant_type=client_credentials&scope=openid",
      ),
    ).toBe(true);
  });

  it("rejects empty credentials with a TypeError", () => {
    for (const [clientId, clientSecret] of [
      ["", "client-secret"],
      ["client-1", " "],
    ]) {
      const error = thrown(() =>
        ClientCredentialsAuthenticator.builder(HOST, clientId, clientSecret),
      );
      expect((error as Error).constructor).toBe(TypeError);
    }
  });

  it("rejects a bad host with a TypeError", () => {
    for (const host of ["", "ftp://example.com", "https://"]) {
      const error = thrown(() =>
        ClientCredentialsAuthenticator.builder(
          host,
          "client-1",
          "client-secret",
        ),
      );
      expect((error as Error).constructor).toBe(TypeError);
      expect(error).not.toBeInstanceOf(ZitadelError);
    }
  });

  it("requires an injected ApiClient", async () => {
    const auth = ClientCredentialsAuthenticator.builder(
      HOST,
      "client-1",
      "client-secret",
    ).build();

    const error = await rejection(auth.getAuthToken());
    expect((error as Error).constructor).toBe(Error);
  });

  it("fails with NetworkError when discovery is unreachable", async () => {
    const auth = stubbed(
      new DefaultApiClient(TransportOptions.builder().build()),
      "http://127.0.0.1:1",
    );

    const error = await rejection(auth.getAuthToken());
    expect((error as Error).constructor).toBe(NetworkError);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as NetworkError).statusCode).toBe(0);
  });

  it("fails with the status error when discovery is non-2xx", async () => {
    const notFound = await rejection(
      stubbed(
        new StubApiClient(response(404, "{}"), response(200, "{}")),
      ).getAuthToken(),
    );
    expect((notFound as Error).constructor).toBe(NotFoundError);
    expect((notFound as NotFoundError).statusCode).toBe(404);
    expect(notFound).toBeInstanceOf(ZitadelError);

    const server = await rejection(
      stubbed(
        new StubApiClient(response(500, "{}"), response(200, "{}")),
      ).getAuthToken(),
    );
    expect((server as Error).constructor).toBe(InternalServerError);
  });

  it("fails with SerializationError when discovery is malformed", async () => {
    for (const body of ["not json", "[]", '{"issuer":"x"}']) {
      const error = await rejection(
        stubbed(
          new StubApiClient(response(200, body), response(200, "{}")),
        ).getAuthToken(),
      );
      expect((error as Error).constructor).toBe(SerializationError);
      expect(error).toBeInstanceOf(ZitadelError);
    }
  });

  it("fails with OAuth2ServerError when the token endpoint rejects", async () => {
    const error = await rejection(
      tokenStubbed(
        401,
        JSON.stringify({ error: "invalid_client", error_description: "bad" }),
      ).getAuthToken(),
    );
    expect((error as Error).constructor).toBe(OAuth2ServerError);
    expect((error as OAuth2ServerError).statusCode).toBe(401);
    expect((error as OAuth2ServerError).code).toBe("invalid_client");
    expect((error as OAuth2ServerError).description).toBe("bad");
    expect(error).toBeInstanceOf(ZitadelError);
    expect(error).not.toBeInstanceOf(ApiError);

    const raw = await rejection(tokenStubbed(503, "down").getAuthToken());
    expect((raw as OAuth2ServerError).statusCode).toBe(503);
    expect((raw as OAuth2ServerError).rawBody).toBe("down");
  });

  it("fails with OAuth2TokenError when the token response is unusable", async () => {
    for (const body of [
      '{"token_type":"Bearer"}',
      "not json",
      '{"access_token":""}',
    ]) {
      const error = await rejection(tokenStubbed(200, body).getAuthToken());
      expect((error as Error).constructor).toBe(OAuth2TokenError);
      expect(error).toBeInstanceOf(ZitadelError);
    }
  });

  it("rejects bad scopes with a TypeError", () => {
    const builder = ClientCredentialsAuthenticator.builder(
      HOST,
      "client-1",
      "client-secret",
    );

    for (const scopes of [[], ["open id"], [""]]) {
      const error = thrown(() => builder.scopes(...scopes));
      expect((error as Error).constructor).toBe(TypeError);
    }
  });

  it("keeps scope order and drops duplicates", async () => {
    const apiClient = new StubApiClient(
      response(200, DISCOVERY),
      response(200, '{"access_token":"t"}'),
    );
    const auth = ClientCredentialsAuthenticator.builder(
      HOST,
      "client-1",
      "client-secret",
    )
      .scopes("openid", "profile", "openid")
      .build();
    auth.setApiClient(apiClient);

    await auth.getAuthToken();

    expect(apiClient.bodies[0]).toContain("&scope=openid+profile&");
  });
});
