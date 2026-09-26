// noinspection ES6PreferShortImport
import { inspect } from "util";
import { PersonalAccessTokenAuthenticator } from "../../src/auth/personal-access-token-authenticator.js";

describe("PersonalAccessTokenAuthenticatorTest", () => {
  test("testReturnsToken", () => {
    const authenticator = new PersonalAccessTokenAuthenticator(
      "api.example.com",
      "my-secret-token",
    );
    expect(authenticator.getAuthHeaders()).toEqual({
      Authorization: "Bearer my-secret-token",
    });
    expect(authenticator.getHost()).toBe("https://api.example.com");
  });

  it("rejects an empty token or a bad host with a TypeError", () => {
    for (const [host, token] of [
      ["https://api.example.com", ""],
      ["ftp://api.example.com", "my-secret-token"],
    ]) {
      let error: unknown = null;
      try {
        new PersonalAccessTokenAuthenticator(host, token);
      } catch (e) {
        error = e;
      }
      expect((error as Error).constructor).toBe(TypeError);
    }
  });

  it("redacts secrets in inspect and JSON output", () => {
    const token = "super-secret-personal-access-token";
    const auth = new PersonalAccessTokenAuthenticator(
      "https://api.example.com",
      token,
    );

    const inspected = inspect(auth);
    const serialised = JSON.stringify(auth);

    expect(inspected).not.toContain(token);
    expect(inspected).toContain("***");
    expect(serialised).not.toContain(token);
    expect(serialised).toContain("***");
  });
});
