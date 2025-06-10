import Zitadel from '../../src/index.js';
// noinspection ES6PreferShortImport
import { ZitadelException } from '../../src/zitadel-exception.js';

/**
 * Retrieve a configuration variable from the environment.
 */
const env = (key: string): string => process.env[key] ?? '';

/**
 * SettingsService Integration Tests (Personal Access Token)
 *
 * This suite verifies the Zitadel SettingsService API's general settings
 * endpoint works when authenticating via Personal Access Token:
 *
 * 1. Retrieve general settings successfully with a valid token
 * 2. Expect an ApiException when using an invalid token
 */
describe('UseAccessTokenSpec', () => {
  /**
   * Validate retrieval of general settings with a valid PAT.
   *
   * @throws {ApiException} on API error
   * @doesNotPerformAssertions
   */
  it('testRetrievesGeneralSettingsWithValidAuth', async () => {
    const client = Zitadel.withAccessToken(env('BASE_URL'), env('AUTH_TOKEN'));

    await client.settings.settingsServiceGetGeneralSettings();
  });

  /**
   * Expect an ApiException when using an invalid PAT.
   * @throws {Error}
   */
  it('testRaisesApiExceptionWithInvalidAuth', async () => {
    const invalid = Zitadel.withAccessToken(env('BASE_URL'), 'invalid');

    await expect(
      invalid.settings.settingsServiceGetGeneralSettings(),
    ).rejects.toThrow(ZitadelException);
  });
});
