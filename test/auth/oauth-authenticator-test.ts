// file: test/auth/oauth-authenticator.test.ts
import { inspect } from "util";
import type * as oauth from "oauth4webapi";
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
// noinspection ES6PreferShortImport
import { OAuthAuthenticator } from "../../src/auth/oauth-authenticator.js";

export function withOauthContainer(
  defineTests: (getOauthHost: () => string) => void,
): void {
  let container: StartedTestContainer;
  let oauthHost = "";

  beforeAll(async () => {
    container = await new GenericContainer(
      "ghcr.io/navikt/mock-oauth2-server:2.1.10",
    )
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forHttp("/", 8080).forStatusCode(405))
      .start();

    // noinspection HttpUrlsUsage
    oauthHost = `http://${container.getHost()}:${container.getMappedPort(8080)}`;
  }, 30_000);

  afterAll(async () => {
    await container.stop();
  });

  describe("with mock OAuth2 server", () => {
    defineTests(() => oauthHost); // 👈 defer access to when test runs
  });
}

/**
 * Minimal concrete {@link OAuthAuthenticator} that exposes a setter for the
 * cached token, so the inherited redaction logic can be exercised without
 * performing a live token exchange against an authorization server.
 */
class StubOAuthAuthenticator extends OAuthAuthenticator {
  public setToken(token: oauth.TokenEndpointResponse): void {
    this.token = token;
  }

  protected performTokenRequest(): Promise<oauth.TokenEndpointResponse> {
    return Promise.reject(new Error("not implemented"));
  }
}

describe("OAuthAuthenticatorTest", () => {
  it("redacts secrets in inspect and JSON output", () => {
    const accessToken = "super-secret-access-token";
    const auth = new StubOAuthAuthenticator(
      "https://api.example.com",
      { issuer: "https://api.example.com" } as oauth.AuthorizationServer,
      { client_id: "visible-client-id" },
      "openid",
    );
    auth.setToken({
      access_token: accessToken,
      token_type: "bearer",
    });

    const inspected = inspect(auth);
    const serialised = JSON.stringify(auth);

    expect(inspected).not.toContain(accessToken);
    expect(inspected).toContain("***");
    expect(serialised).not.toContain(accessToken);
    expect(serialised).toContain("***");
  });
});
