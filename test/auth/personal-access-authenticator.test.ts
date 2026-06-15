// noinspection ES6PreferShortImport
import { inspect } from "util";
import { PersonalAccessAuthenticator } from "../../src/auth/personal-access-authenticator.js";

describe("PersonalAccessAuthenticatorTest", () => {
  test("testReturnsToken", async () => {
    const authenticator = new PersonalAccessAuthenticator(
      "https://api.example.com",
      "my-secret-token",
    );
    expect(authenticator.getAuthHeaders()).toEqual({
      Authorization: "Bearer my-secret-token",
    });
  });

  it("redacts secrets in inspect and JSON output", () => {
    const token = "super-secret-personal-access-token";
    const auth = new PersonalAccessAuthenticator(
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
