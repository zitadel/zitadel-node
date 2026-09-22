// noinspection ES6PreferShortImport
import { NoAuthAuthenticator } from "../../src/auth/no-auth-authenticator.js";

describe("NoAuthAuthenticatorTest", () => {
  test("testReturnsEmptyHeadersAndDefaultHost", () => {
    const authenticator = new NoAuthAuthenticator();
    expect(authenticator.getAuthHeaders()).toEqual({});
    expect(authenticator.getHost()).toBe("http://localhost");
  });
});
