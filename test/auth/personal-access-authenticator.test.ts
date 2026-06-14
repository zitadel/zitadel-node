// noinspection ES6PreferShortImport
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
});
