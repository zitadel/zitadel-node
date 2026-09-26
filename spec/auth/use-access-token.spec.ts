import Zitadel from "../../src/index.js";
import { PersonalAccessTokenAuthenticator } from "../../src/auth/personal-access-token-authenticator.js";
// noinspection ES6PreferShortImport
import { UnauthorizedError } from "../../src/errors/unauthorized-error.js";
import { useIntegrationEnvironment } from "../base-spec.js";

/**
 * SettingsService Integration Tests (Personal Access Token)
 *
 * This suite verifies the Zitadel SettingsService API's general settings
 * endpoint works when authenticating via Personal Access Token:
 *
 * 1. Retrieve general settings successfully with a valid token
 * 2. Expect an UnauthorizedError when using an invalid token
 */
describe("UseAccessTokenSpec", () => {
  const { context } = useIntegrationEnvironment();

  /**
   * Validate retrieval of general settings with a valid PAT.
   *
   * @throws {ApiError} on API error
   * @doesNotPerformAssertions
   */
  it("testRetrievesGeneralSettingsWithValidAuth", async () => {
    const client = Zitadel.withAuthenticator(
      new PersonalAccessTokenAuthenticator(context.baseUrl, context.authToken),
    );

    await client.settingsService.getGeneralSettings({ body: {} });
  });

  /**
   * Expect an UnauthorizedError when using an invalid PAT.
   * @throws {Error}
   */
  it("testRaisesApiExceptionWithInvalidAuth", async () => {
    const invalid = Zitadel.withAuthenticator(
      new PersonalAccessTokenAuthenticator(context.baseUrl, "invalid"),
    );

    let error: unknown = null;
    try {
      await invalid.settingsService.getGeneralSettings({ body: {} });
    } catch (e) {
      error = e;
    }
    expect((error as Error).constructor).toBe(UnauthorizedError);
  }, 120000);
});
