import { ClientCredentialsAuthenticator } from '../../src/auth/client-credentials-authenticator.js';
import { withOauthContainer } from './oauth-authenticator-test.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Tests for the ClientCredentialsAuthenticator.
 *
 * This test verifies that the client credentials authenticator correctly
 * refreshes its token and returns the proper Authorization header.
 */
describe('ClientCredentialsAuthenticatorTest', () => {
  withOauthContainer((getOauthHost) => {
    test('testRefreshToken', async () => {
      const oauthHost = getOauthHost();
      await sleep(20);

      const authenticator = await ClientCredentialsAuthenticator.builder(
        oauthHost,
        'dummy-client',
        'dummy-secret',
      )
        .scopes(['openid', 'foo'])
        .build();

      expect(await authenticator.getAuthToken()).not.toBeFalsy();
      const token = await authenticator.refreshToken();
      expect(token.access_token).not.toBeFalsy();

      const expiresIn = token.expires_in ?? 0;
      const tokenExpiryTimestamp = Date.now() + expiresIn * 1000;
      expect(tokenExpiryTimestamp > Date.now()).toBe(true);

      expect(token.access_token).toBe(await authenticator.getAuthToken());
      expect(authenticator.getHost().toString()).toBe(oauthHost + '/');

      expect((await authenticator.refreshToken()).access_token).not.toEqual(
        (await authenticator.refreshToken()).access_token,
      );
    }, 40000);
  });
});
