import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
// noinspection ES6PreferShortImport
import { NoAuthAuthenticator } from '../src/auth/noauth-authenticator.js';
import Zitadel from '../src/index.js';

/**
 * This test verifies that all API service classes in the "src/apis"
 * directory, as discovered by reading the filesystem, are registered as typed
 * properties in the Zitadel class. This ensures that every API service is
 * properly registered in the SDK.
 */
describe('ZitadelTest', () => {
  /**
   * Verifies that the set of expected API service classes matches the set of
   * actual service properties in Zitadel.
   * @throws {Error} when it is unable to look up classes in the namespace
   */
  it('testServicesDynamic', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const apiDir = path.join(__dirname, '..', 'src', 'apis');
    const apiFiles = fs.readdirSync(apiDir);
    const expected = apiFiles
      .filter((file) => file.endsWith('ServiceApi.ts'))
      .map((file) => file.replace('.ts', ''))
      .sort();

    const zitadel = new Zitadel(new NoAuthAuthenticator());
    const properties = Object.values(zitadel);
    const actual: string[] = [];
    for (const prop of properties) {
      if (prop?.constructor?.name.endsWith('ServiceApi')) {
        actual.push(prop.constructor.name);
      }
    }
    actual.sort();

    expect(actual).toEqual(expected);
  });
});
