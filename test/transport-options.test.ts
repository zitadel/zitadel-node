import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  GenericContainer,
  Network,
  StartedNetwork,
  StartedTestContainer,
  Wait,
} from 'testcontainers';
import Zitadel from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

describe('TransportOptionsTest', () => {
  let network: StartedNetwork;
  let container: StartedTestContainer;
  let proxyContainer: StartedTestContainer;
  let host: string;
  let httpPort: number;
  let httpsPort: number;
  let proxyPort: number;
  let certPath: string;

  beforeAll(async () => {
    certPath = path.join(FIXTURES_DIR, 'ca.pem');

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
      .withCopyDirectoryToContainer({
        source: path.join(FIXTURES_DIR, 'mappings'),
        target: '/home/wiremock/mappings',
      })
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

  test('custom CA cert allows HTTPS connection', async () => {
    const zitadel = await Zitadel.withClientCredentials(
      `https://${host}:${httpsPort}`,
      'dummy-client',
      'dummy-secret',
      { caCertPath: certPath },
    );
    expect(zitadel).toBeTruthy();
  }, 30_000);

  test('insecure mode allows HTTPS with untrusted cert', async () => {
    const zitadel = await Zitadel.withClientCredentials(
      `https://${host}:${httpsPort}`,
      'dummy-client',
      'dummy-secret',
      { insecure: true },
    );
    expect(zitadel).toBeTruthy();
  }, 30_000);

  test('default headers are sent with requests', async () => {
    const zitadel = await Zitadel.withClientCredentials(
      `http://${host}:${httpPort}`,
      'dummy-client',
      'dummy-secret',
      { defaultHeaders: { 'X-Custom-Header': 'test-value' } },
    );
    expect(zitadel).toBeTruthy();

    await expect(
      zitadel.settings.getGeneralSettings({ body: {} }),
    ).resolves.toBeDefined();

    const verifyRes = await fetch(
      `http://${host}:${httpPort}/__admin/requests/count`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: '/zitadel.settings.v2.SettingsService/GetGeneralSettings',
          headers: { 'X-Custom-Header': { equalTo: 'test-value' } },
        }),
      },
    );
    const { count } = (await verifyRes.json()) as { count: number };
    expect(count).toBeGreaterThanOrEqual(1);
  }, 30_000);

  test('proxy URL routes requests through proxy', async () => {
    const zitadel = Zitadel.withAccessToken(
      'http://wiremock:8080',
      'test-token',
      {
        proxyUrl: `http://${host}:${proxyPort}`,
      },
    );
    expect(zitadel).toBeTruthy();

    await expect(
      zitadel.settings.getGeneralSettings({ body: {} }),
    ).resolves.toBeDefined();
  }, 30_000);

  test('HTTPS without CA cert or insecure fails', async () => {
    await expect(
      Zitadel.withClientCredentials(
        `https://${host}:${httpsPort}`,
        'dummy-client',
        'dummy-secret',
      ),
    ).rejects.toThrow();
  }, 30_000);
});
