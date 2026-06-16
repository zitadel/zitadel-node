// noinspection ES6PreferShortImport
import { inspect } from "util";
import type * as oauth from "oauth4webapi";
import { ClientCredentialsAuthenticator } from "../../src/auth/client-credentials-authenticator.js";
import { OpenId } from "../../src/auth/openid.js";
import { withOauthContainer } from "./oauth-authenticator-test.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Tests for the ClientCredentialsAuthenticator.
 *
 * This test verifies that the client credentials authenticator correctly
 * refreshes its token and returns the proper Authorization header.
 */
describe("ClientCredentialsAuthenticatorTest", () => {
  withOauthContainer((getOauthHost) => {
    test("testRefreshToken", async () => {
      const oauthHost = getOauthHost();
      await sleep(20);

      const authenticator = await ClientCredentialsAuthenticator.builder(
        oauthHost,
        "dummy-client",
        "dummy-secret",
      )
        .scopes(["openid", "foo"])
        .build();

      expect(await authenticator.getAuthToken()).not.toBeFalsy();
      const token = await authenticator.refreshToken();
      expect(token.access_token).not.toBeFalsy();

      const expiresIn = token.expires_in ?? 0;
      const tokenExpiryTimestamp = Date.now() + expiresIn * 1000;
      expect(tokenExpiryTimestamp > Date.now()).toBe(true);

      // noinspection DuplicatedCode
      expect(token.access_token).toBe(await authenticator.getAuthToken());
      expect(authenticator.getHost().toString()).toBe(oauthHost + "/");

      expect((await authenticator.refreshToken()).access_token).not.toEqual(
        (await authenticator.refreshToken()).access_token,
      );
    }, 40000);
  });

  /**
   * Builds an {@link OpenId} stand-in exposing only the two accessors the
   * {@link ClientCredentialsAuthenticator} constructor consumes, so the
   * authenticator can be constructed without performing live OpenID discovery.
   */
  const fakeOpenId = (host: string): OpenId => {
    const authServer = { issuer: host } as oauth.AuthorizationServer;
    return {
      getAuthorizationServer: () => authServer,
      getHostEndpoint: () => host,
    } as unknown as OpenId;
  };

  it("redacts secrets in inspect and JSON output", () => {
    const secret = "super-secret-client-secret";
    const auth = new ClientCredentialsAuthenticator(
      fakeOpenId("https://api.example.com"),
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
});
