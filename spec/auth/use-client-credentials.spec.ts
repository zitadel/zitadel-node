import Zitadel from '../../src/index.js';
// noinspection ES6PreferShortImport
import { ZitadelException } from '../../src/zitadel-exception.js';

/**
 * Retrieve a configuration variable from the environment.
 */
const env = (key: string): string => process.env[key] ?? '';

/**
 * SettingsService Integration Tests (Client Credentials)
 *
 * This suite verifies the Zitadel SettingsService API's general settings
 * endpoint works when authenticating via Client Credentials:
 *
 * 1. Retrieve general settings successfully with valid credentials
 * 2. Expect an ApiException when using invalid credentials
 */
describe('UseClientCredentialsSpec', () => {
  /**
   * Validate retrieval of general settings with valid client credentials.
   *
   * @throws {ApiException} on API error
   * @throws {Error}
   * @doesNotPerformAssertions
   */
  it('testRetrievesGeneralSettingsWithValidAuth', async () => {
    const client = await Zitadel.withClientCredentials(
      env('BASE_URL'),
      env('CLIENT_ID'),
      env('CLIENT_SECRET'),
    );

    await client.settings.settingsServiceGetGeneralSettings();
  });

  /**
   * Expect an ApiException when using invalid client credentials.
   * @throws {Error}
   */
  it('testRaisesApiExceptionWithInvalidAuth', async () => {
    const invalid = await Zitadel.withClientCredentials(
      env('BASE_URL'),
      'invalid',
      'invalid',
    );

    await expect(
      invalid.settings.settingsServiceGetGeneralSettings(),
    ).rejects.toThrow(ZitadelException);
  });
});
