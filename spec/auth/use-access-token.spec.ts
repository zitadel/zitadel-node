import Zitadel from '../../src/index.js';
// noinspection ES6PreferShortImport
import { ZitadelException } from '../../src/zitadel-exception.js';
import { useIntegrationEnvironment } from '../base-spec.js';

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
  const { context } = useIntegrationEnvironment();

  /**
   * Validate retrieval of general settings with a valid PAT.
   *
   * @throws {ApiException} on API error
   * @doesNotPerformAssertions
   */
  it('testRetrievesGeneralSettingsWithValidAuth', async () => {
    const client = Zitadel.withAccessToken(context.baseUrl, context.authToken);

    await client.settings.getGeneralSettings({ body: {} });
  });

  /**
   * Expect an ApiException when using an invalid PAT.
   * @throws {Error}
   */
  it('testRaisesApiExceptionWithInvalidAuth', async () => {
    const invalid = Zitadel.withAccessToken(context.baseUrl, 'invalid');

    await expect(
      invalid.settings.getGeneralSettings({ body: {} }),
    ).rejects.toThrow(ZitadelException);
  }, 120000);
});
