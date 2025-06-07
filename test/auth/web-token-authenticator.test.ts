import { generateKeyPair } from 'node:crypto';
import { WebTokenAuthenticator } from '../../src/auth/webtoken-authenticator.js';
import { withOauthContainer } from './oauth-authenticator-test.js';

describe('WebTokenAuthenticatorTest', () => {
  const getPrivateKey = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      generateKeyPair(
        'rsa',
        {
          modulusLength: 2048,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        },
        (err, publicKey, privKey) => {
          if (err) {
            return reject(err);
          }
          resolve(privKey);
        },
      );
    });
  };

  withOauthContainer((getOauthHost) => {
    test('testRefreshToken', async () => {
      const oauthHost = getOauthHost();
      const authenticator = await WebTokenAuthenticator.builder(
        oauthHost,
        '1',
        await getPrivateKey(),
      )
        .scopes(['openid', 'foo'])
        .build();

      expect(await authenticator.getAuthToken()).not.toBeFalsy();
      const token = await authenticator.refreshToken();
      expect(token.access_token).not.toBeFalsy();
      expect(token.expires_in && token.expires_in > 0).toBe(true);
      expect(token.access_token).toBe(await authenticator.getAuthToken());
      expect(authenticator.getHost().toString()).toBe(oauthHost + '/');
      expect((await authenticator.refreshToken()).access_token).not.toEqual(
        (await authenticator.refreshToken()).access_token,
      );
    }, 30000);

    test('testRefreshTokenWithRS256', async () => {
      const oauthHost = getOauthHost();
      const authenticator = await WebTokenAuthenticator.builder(
        oauthHost,
        '1',
        await getPrivateKey(),
      )
        .jwtAlgorithm('RS256')
        .build();

      expect(await authenticator.getAuthToken()).not.toBeFalsy();
      const token = await authenticator.refreshToken();
      expect(token.access_token).not.toBeFalsy();
      expect(token.expires_in && token.expires_in > 0).toBe(true);
      expect(token.access_token).toBe(await authenticator.getAuthToken());
      expect(authenticator.getHost().toString()).toBe(oauthHost + '/');
      expect((await authenticator.refreshToken()).access_token).not.toEqual(
        (await authenticator.refreshToken()).access_token,
      );
    }, 30000);

    test('testRefreshTokenWithExtendedLifetime', async () => {
      const oauthHost = getOauthHost();
      const authenticator = await WebTokenAuthenticator.builder(
        oauthHost,
        '1',
        await getPrivateKey(),
      )
        .tokenLifetimeSeconds(86400)
        .build();

      expect(await authenticator.getAuthToken()).not.toBeFalsy();
      const token = await authenticator.refreshToken();
      expect(token.access_token).not.toBeFalsy();
      expect(token.expires_in && token.expires_in > 0).toBe(true);
      expect(token.access_token).toBe(await authenticator.getAuthToken());
      expect(authenticator.getHost().toString()).toBe(oauthHost + '/');
      expect((await authenticator.refreshToken()).access_token).not.toEqual(
        (await authenticator.refreshToken()).access_token,
      );
    }, 40000);
  });
});
