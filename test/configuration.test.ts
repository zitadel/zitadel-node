import { arch, platform, version as nodeVersion } from 'process';
// noinspection ES6PreferShortImport
import { Configuration } from '../src/configuration.js';
// noinspection ES6PreferShortImport
import { PersonalAccessAuthenticator } from '../src/auth/personal-access-authenticator.js';
import { VERSION } from '../src/version.js';

describe('ConfigurationTest', () => {
  /**
   * Test user agent getter and setter
   */
  it('testUserAgent', () => {
    const authenticator = new PersonalAccessAuthenticator(
      'https://zitadel.com',
      'secretmet',
    );
    const config = new Configuration(authenticator);

    const expectedRegex = new RegExp(
      `^zitadel-client/${VERSION} \\(lang=ts; lang_version=${nodeVersion}; os=${platform}; arch=${arch}\\)$`,
    );
    expect(config.userAgent).toMatch(expectedRegex);

    const configWithCustomUa = new Configuration(authenticator, {
      userAgent: 'CustomUserAgent/1.0',
    });
    expect(configWithCustomUa.userAgent).toBe('CustomUserAgent/1.0');
  });

  /**
   * Test getting access token
   */
  it('testGetAccessToken', async () => {
    const authenticator = new PersonalAccessAuthenticator(
      'https://zitadel.com',
      'secretmet',
    );
    const config = new Configuration(authenticator);

    expect(await config.accessToken()).toBe('secretmet');
  });

  /**
   * Test getting host from authenticator
   */
  it('testGetHost', () => {
    const authenticator = new PersonalAccessAuthenticator(
      'https://zitadel.com',
      'secretmet',
    );
    const config = new Configuration(authenticator);

    expect(config.basePath).toBe('https://zitadel.com/');
  });
});
