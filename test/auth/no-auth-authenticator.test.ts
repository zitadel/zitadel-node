import { NoAuthAuthenticator } from '../../src/auth/noauth-authenticator.js';

describe('NoAuthAuthenticatorTest', () => {
  test('testReturnsEmptyToken', async () => {
    const authenticator = new NoAuthAuthenticator();

    expect(await authenticator.getAuthToken()).toBe('');
  });
});
