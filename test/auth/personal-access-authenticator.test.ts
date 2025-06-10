// noinspection ES6PreferShortImport
import { PersonalAccessAuthenticator } from '../../src/auth/personal-access-authenticator.js';

describe('PersonalAccessAuthenticatorTest', () => {
  test('testReturnsToken', async () => {
    const authenticator = new PersonalAccessAuthenticator(
      'https://api.example.com',
      'my-secret-token',
    );
    expect(await authenticator.getAuthToken()).toBe('my-secret-token');
  });
});
