import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
// noinspection ES6PreferShortImport
import { NoAuthAuthenticator } from '../src/auth/noauth-authenticator.js';
import Zitadel from '../src/index.js';

describe('ZitadelTest', () => {
  function kebabToPascalCase(kebabStr: string): string {
    return kebabStr
      .split('-')
      .map((word) => {
        const lowerWord = word.toLowerCase();
        // If word is short (2-4 chars) and all consonants or common tech acronyms pattern
        if (
          word.length >= 2 &&
          word.length <= 4 &&
          !/[aeiou]/.test(lowerWord.slice(1))
        ) {
          // No vowels after first char suggests acronym
          return word.toUpperCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('');
  }

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
      .filter((file) => file.endsWith('service-api.ts'))
      .map((file) => file.replace('.ts', ''))
      .map(kebabToPascalCase)
      .map((fff) => fff.toLowerCase())
      .sort();

    const zitadel = new Zitadel(new NoAuthAuthenticator());
    const properties = Object.values(zitadel);
    const actual: string[] = [];

    for (const prop of properties) {
      if (prop?.constructor?.name.endsWith('ServiceApi')) {
        actual.push(prop.constructor.name.toLowerCase());
      }
    }
    actual.sort();

    expect(actual).toEqual(expected);
  });
});
