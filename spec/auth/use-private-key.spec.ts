import Zitadel from "../../src/index.js";
import { generateKeyPairSync } from "node:crypto";
import { WebTokenAuthenticator } from "../../src/auth/web-token-authenticator.js";
// noinspection ES6PreferShortImport
import { OAuth2ServerError } from "../../src/errors/oauth2-server-error.js";
import { useIntegrationEnvironment } from "../base-spec.js";

/**
 * SettingsService Integration Tests (Private Key Assertion)
 *
 * This suite verifies the Zitadel SettingsService API's general settings
 * endpoint works when authenticating via a private key assertion:
 *
 * 1. Retrieve general settings successfully with a valid private key
 * 2. Expect an OAuth2ServerError when signing with a key the instance does not know
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
      WebTokenAuthenticator.fromJson(context.baseUrl, context.jwtKey),
    );
    await client.settingsService.getGeneralSettings({ body: {} });
  }, 120000);

  /**
   * Expect an OAuth2ServerError when signing with a key the instance does not know.
   * @throws {Error}
   */
  it("testRaisesApiExceptionWithInvalidAuth", async () => {
    const { privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    const invalid = Zitadel.withAuthenticator(
      WebTokenAuthenticator.builder(context.baseUrl, "invalid", privateKey)
        .keyId("invalid")
        .build(),
    );
    let error: unknown = null;
    try {
      await invalid.settingsService.getGeneralSettings({ body: {} });
    } catch (e) {
      error = e;
    }
    expect((error as Error).constructor).toBe(OAuth2ServerError);
  }, 120000);
});
