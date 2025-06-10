import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import Zitadel from '../../src/index.js';
// noinspection ES6PreferShortImport
import { ZitadelException } from '../../src/zitadel-exception.js';

/**
 * Retrieve a configuration variable from the environment.
 */
const env = (key: string): string => process.env[key] ?? '';

const createTempJwtFile = (): string => {
  const k = env('JWT_KEY');
  // Note: Using a simple temp file name for clarity.
  // In a real-world concurrent test suite, a more robust unique name is advised.
  const p = path.join(os.tmpdir(), `jwt_${Date.now()}`);
  fs.writeFileSync(p, k);
  return p;
};

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
  /**
   * Validate retrieval of general settings with a valid private key assertion.
   *
   * @throws {ApiException} on API error
   * @throws {Error}
   * @doesNotPerformAssertions
   */
  it('testRetrievesGeneralSettingsWithValidAuth', async () => {
    const tempFile = createTempJwtFile();
    try {
      const client = await Zitadel.withPrivateKey(env('BASE_URL'), tempFile);
      await client.settings.settingsServiceGetGeneralSettings();
    } finally {
      fs.unlinkSync(tempFile); // Cleanup
    }
  });

  /**
   * Expect an ApiException when using an invalid private key assertion.
   * @throws {Error}
   */
  it('testRaisesApiExceptionWithInvalidAuth', async () => {
    const tempFile = createTempJwtFile();
    try {
      // Note: The original test uses a valid key with an invalid host.
      const invalid = await Zitadel.withPrivateKey(
        'https://zitadel.cloud',
        tempFile,
      );
      await expect(
        invalid.settings.settingsServiceGetGeneralSettings(),
      ).rejects.toThrow(ZitadelException);
    } finally {
      fs.unlinkSync(tempFile); // Cleanup
    }
  });
});
