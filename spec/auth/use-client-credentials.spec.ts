import Zitadel from '../../src/index.js';
// noinspection ES6PreferShortImport
import { ZitadelException } from '../../src/zitadel-exception.js';
import { useIntegrationEnvironment } from '../base-spec.js';

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
  const { context } = useIntegrationEnvironment();

  async function generateUserSecret(token: string, loginName = 'api-user') {
    const userUrl = new URL(
      'http://localhost:8099/management/v1/global/users/_by_login_name',
    );
    userUrl.searchParams.set('loginName', loginName);

    let userIdResponse;
    try {
      userIdResponse = await fetch(userUrl.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `API call to retrieve user failed for login name: '${loginName}'. Reason: ${error.message}`,
        );
      }
      throw new Error(
        `An unknown error occurred while retrieving user for login name: '${loginName}'.`,
      );
    }

    if (userIdResponse.ok) {
      const userPayload = await userIdResponse.json();
      const userId = userPayload?.user?.id;

      if (userId && typeof userId === 'string') {
        const secretUrl = `http://localhost:8099/management/v1/users/${userId}/secret`;

        let secretResponse;
        try {
          secretResponse = await fetch(secretUrl, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: '{}',
            signal: AbortSignal.timeout(5000),
          });
        } catch (error) {
          if (error instanceof Error) {
            throw new Error(
              `API call to generate secret failed for user ID: '${userId}'. Reason: ${error.message}`,
            );
          }
          throw new Error(
            `An unknown error occurred during the API call to generate a secret for user ID: '${userId}'.`,
          );
        }

        if (secretResponse.ok) {
          const secretData = await secretResponse.json();
          const { clientId, clientSecret } = secretData;

          if (clientId && clientSecret) {
            return { clientId, clientSecret };
          } else {
            throw new Error(
              "API response for secret is missing 'clientId' or 'clientSecret'.",
            );
          }
        } else {
          const errorBody = await secretResponse.text();
          throw new Error(
            `API call to generate secret failed for user ID: '${userId}'. Response: ${errorBody}`,
          );
        }
      } else {
        throw new Error(
          `Could not parse a valid user ID from API response for login name: '${loginName}'.`,
        );
      }
    } else {
      const errorBody = await userIdResponse.text();
      throw new Error(
        `API call to retrieve user failed for login name: '${loginName}'. Response: ${errorBody}`,
      );
    }
  }

  /**
   * Validate retrieval of general settings with valid client credentials.
   *
   * @throws {ApiException} on API error
   * @throws {Error}
   * @doesNotPerformAssertions
   */
  it('testRetrievesGeneralSettingsWithValidAuth', async () => {
    const credentials = await generateUserSecret(context.authToken);
    const client = await Zitadel.withClientCredentials(
      context.baseUrl,
      credentials.clientId,
      credentials.clientSecret,
    );

    await client.settings.settingsServiceGetGeneralSettings();
  }, 120000);

  /**
   * Expect an ApiException when using invalid client credentials.
   * @throws {Error}
   */
  it('testRaisesApiExceptionWithInvalidAuth', async () => {
    const invalid = await Zitadel.withClientCredentials(
      context.baseUrl,
      'invalid',
      'invalid',
    );

    await expect(
      invalid.settings.settingsServiceGetGeneralSettings(),
    ).rejects.toThrow(ZitadelException);
  }, 120000);
});
