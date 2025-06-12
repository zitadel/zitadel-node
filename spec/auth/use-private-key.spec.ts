import Zitadel from '../../src/index.js';
// noinspection ES6PreferShortImport
import { ZitadelException } from '../../src/zitadel-exception.js';
import { useIntegrationEnvironment } from '../base-spec.js';

/**
 * SettingsService Integration Tests (Private Key Assertion)
 *
 * This suite verifies the Zitadel SettingsService API's general settings
 * endpoint works when authenticating via a private key assertion:
 *
 * 1. Retrieve general settings successfully with a valid private key
 * 2. Expect an ApiException when using an invalid private key
 */
describe('UsePrivateKeySpec', () => {
  const { context } = useIntegrationEnvironment();

  /**
   * Validate retrieval of general settings with a valid private key assertion.
   *
   * @throws {ApiException} on API error
   * @throws {Error}
   * @doesNotPerformAssertions
   */
  it('testRetrievesGeneralSettingsWithValidAuth', async () => {
    const client = await Zitadel.withPrivateKey(
      context.baseUrl,
      context.jwtKey,
    );
    await client.settings.settingsServiceGetGeneralSettings();
  });

  /**
   * Expect an ApiException when using an invalid private key assertion.
   * @throws {Error}
   */
  it('testRaisesApiExceptionWithInvalidAuth', async () => {
    const invalid = await Zitadel.withPrivateKey(
      'https://zitadel.cloud',
      context.jwtKey,
    );
    await expect(
      invalid.settings.settingsServiceGetGeneralSettings(),
    ).rejects.toThrow(ZitadelException);
  });
});
