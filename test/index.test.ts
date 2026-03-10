import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  GenericContainer,
  Network,
  StartedNetwork,
  StartedTestContainer,
  Wait,
} from 'testcontainers';
import { NoAuthAuthenticator } from '../src/auth/noauth-authenticator.js';
import Zitadel from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

describe('ZitadelTest', () => {
  let network: StartedNetwork;
  let container: StartedTestContainer;
  let proxyContainer: StartedTestContainer;
  let host: string;
  let httpPort: number;
  let httpsPort: number;
  let proxyPort: number;
  let caCertPath: string;

  beforeAll(async () => {
    caCertPath = path.join(FIXTURES_DIR, 'ca.pem');

    network = await new Network().start();

    container = await new GenericContainer('wiremock/wiremock:3.12.1')
      .withNetwork(network)
      .withNetworkAliases('wiremock')
      .withCommand([
        '--https-port',
        '8443',
        '--https-keystore',
        '/home/wiremock/keystore.p12',
        '--keystore-password',
        'password',
        '--keystore-type',
        'PKCS12',
        '--global-response-templating',
      ])
      .withCopyFilesToContainer([
        {
          source: path.join(FIXTURES_DIR, 'keystore.p12'),
          target: '/home/wiremock/keystore.p12',
        },
      ])
      .withCopyDirectoriesToContainer([
        {
          source: path.join(FIXTURES_DIR, 'mappings'),
          target: '/home/wiremock/mappings',
        },
      ])
      .withExposedPorts(8080, 8443)
      .withWaitStrategy(
        Wait.forHttp('/__admin/mappings', 8080).forStatusCode(200),
      )
      .start();

    proxyContainer = await new GenericContainer('ubuntu/squid:6.10-24.10_beta')
      .withNetwork(network)
      .withExposedPorts(3128)
      .withCopyFilesToContainer([
        {
          source: path.join(FIXTURES_DIR, 'squid.conf'),
          target: '/etc/squid/squid.conf',
        },
      ])
      .withWaitStrategy(Wait.forListeningPorts())
      .start();

    host = container.getHost();
    httpPort = container.getMappedPort(8080);
    httpsPort = container.getMappedPort(8443);
    proxyPort = proxyContainer.getMappedPort(3128);
  }, 30_000);

  afterAll(async () => {
    if (proxyContainer) {
      await proxyContainer.stop();
    }
    if (container) {
      await container.stop();
    }
    if (network) {
      await network.stop();
    }
  });

  function kebabToPascalCase(kebabStr: string): string {
    return kebabStr
      .split('-')
      .map((word) => {
        const lowerWord = word.toLowerCase();
        if (
          word.length >= 2 &&
          word.length <= 4 &&
          !/[aeiou]/.test(lowerWord.slice(1))
        ) {
          return word.toUpperCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('');
  }

  test('testServicesDynamic', () => {
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

  test('testCustomCaCert', async () => {
    const zitadel = await Zitadel.withClientCredentials(
      `https://${host}:${httpsPort}`,
      'dummy-client',
      'dummy-secret',
      { caCertPath: caCertPath },
    );

    const response = await zitadel.settings.getGeneralSettings({ body: {} });
    expect(response.defaultLanguage).toBe('https');
  }, 30_000);

  test('testInsecureMode', async () => {
    const zitadel = await Zitadel.withClientCredentials(
      `https://${host}:${httpsPort}`,
      'dummy-client',
      'dummy-secret',
      { insecure: true },
    );

    const response = await zitadel.settings.getGeneralSettings({ body: {} });
    expect(response.defaultLanguage).toBe('https');
  }, 30_000);

  test('testDefaultHeaders', async () => {
    const zitadel = await Zitadel.withClientCredentials(
      `http://${host}:${httpPort}`,
      'dummy-client',
      'dummy-secret',
      { defaultHeaders: { 'X-Custom-Header': 'test-value' } },
    );

    const response = await zitadel.settings.getGeneralSettings({ body: {} });
    expect(response.defaultLanguage).toBe('http');
    expect(response.defaultOrgId).toBe('test-value');
  }, 30_000);

  test('testProxyUrl', async () => {
    const zitadel = Zitadel.withAccessToken(
      'http://wiremock:8080',
      'test-token',
      {
        proxyUrl: `http://${host}:${proxyPort}`,
      },
    );

    const response = await zitadel.settings.getGeneralSettings({ body: {} });
    expect(response.defaultLanguage).toBe('http');
  }, 30_000);

  test('testNoCaCertFails', async () => {
    await expect(
      Zitadel.withClientCredentials(
        `https://${host}:${httpsPort}`,
        'dummy-client',
        'dummy-secret',
      ),
    ).rejects.toThrow();
  }, 30_000);
});
