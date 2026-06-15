import Zitadel from "../../src/index.js";
import { WebTokenAuthenticator } from "../../src/auth/webtoken-authenticator.js";
// noinspection ES6PreferShortImport
import { ZitadelError } from "../../src/errors/zitadel-error.js";
import { useIntegrationEnvironment } from "../base-spec.js";

/**
 * SettingsService Integration Tests (Private Key Assertion)
 *
 * This suite verifies the Zitadel SettingsService API's general settings
 * endpoint works when authenticating via a private key assertion:
 *
 * 1. Retrieve general settings successfully with a valid private key
 * 2. Expect an ApiError when using an invalid private key
 */
describe("UsePrivateKeySpec", () => {
  const { context } = useIntegrationEnvironment();

  /**
   * Validate retrieval of general settings with a valid private key assertion.
   *
   * @throws {ApiError} on API error
   * @throws {Error}
   * @doesNotPerformAssertions
   */
  it("testRetrievesGeneralSettingsWithValidAuth", async () => {
    const client = Zitadel.withAuthenticator(
      await WebTokenAuthenticator.fromJson(context.baseUrl, context.jwtKey),
    );
    await client.settingsService.getGeneralSettings({ body: {} });
  }, 120000);

  /**
   * Expect an ApiError when using an invalid private key assertion.
   * @throws {Error}
   */
  it("testRaisesApiExceptionWithInvalidAuth", async () => {
    const invalid = Zitadel.withAuthenticator(
      await WebTokenAuthenticator.fromJson(
        "https://zitadel.cloud",
        context.jwtKey,
      ),
    );
    await expect(
      invalid.settingsService.getGeneralSettings({ body: {} }),
    ).rejects.toThrow(ZitadelError);
  }, 120000);
});
