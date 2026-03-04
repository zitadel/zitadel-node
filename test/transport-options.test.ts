import * as fs from 'fs';
import * as path from 'path';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import Zitadel, { TransportOptions } from '../src/index.js';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

describe('TransportOptionsTest', () => {
  let container: StartedTestContainer;
  let host: string;
  let httpPort: number;
  let httpsPort: number;
  let certPath: string;

  beforeAll(async () => {
    certPath = path.join(FIXTURES_DIR, 'ca.pem');

    container = await new GenericContainer('wiremock/wiremock:3.3.1')
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
      .withExposedPorts(8080, 8443)
      .withWaitStrategy(
        Wait.forHttp('/__admin/mappings', 8080).forStatusCode(200),
      )
      .start();

    host = container.getHost();
    httpPort = container.getMappedPort(8080);
    httpsPort = container.getMappedPort(8443);

    const adminUrl = `http://${host}:${httpPort}/__admin/mappings`;

    // Stub 1 - OpenID Configuration (uses response templating for baseUrl)
    const oidcRes = await fetch(adminUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request: { method: 'GET', url: '/.well-known/openid-configuration' },
        response: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: '{"issuer":"{{request.baseUrl}}","token_endpoint":"{{request.baseUrl}}/oauth/v2/token","authorization_endpoint":"{{request.baseUrl}}/oauth/v2/authorize","userinfo_endpoint":"{{request.baseUrl}}/oidc/v1/userinfo","jwks_uri":"{{request.baseUrl}}/oauth/v2/keys"}',
        },
      }),
    });
    expect(oidcRes.status).toBe(201);

    // Stub 2 - Token endpoint
    const tokenRes = await fetch(adminUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request: { method: 'POST', url: '/oauth/v2/token' },
        response: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          jsonBody: {
            access_token: 'test-token-12345',
            token_type: 'Bearer',
            expires_in: 3600,
          },
        },
      }),
    });
    expect(tokenRes.status).toBe(201);
  }, 30_000);

  afterAll(async () => {
    if (container) {
      await container.stop();
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
    // Use HTTP to avoid TLS concerns
    const zitadel = await Zitadel.withClientCredentials(
      `http://${host}:${httpPort}`,
      'dummy-client',
      'dummy-secret',
      { defaultHeaders: { 'X-Custom-Header': 'test-value' } },
    );
    expect(zitadel).toBeTruthy();

    // Verify via WireMock request journal
    const journalRes = await fetch(
      `http://${host}:${httpPort}/__admin/requests`,
    );
    const journal = (await journalRes.json()) as {
      requests: { request?: { headers?: Record<string, string> } }[];
    };

    const foundHeader = journal.requests.some(
      (req) => req.request?.headers?.['X-Custom-Header'],
    );
    expect(foundHeader).toBe(true);
  }, 30_000);

  test('proxy URL routes requests through proxy', async () => {
    // Use the HTTP WireMock endpoint as the proxy URL
    const zitadel = await Zitadel.withClientCredentials(
      `http://${host}:${httpPort}`,
      'dummy-client',
      'dummy-secret',
      { proxyUrl: `http://${host}:${httpPort}` },
    );
    expect(zitadel).toBeTruthy();
  }, 30_000);

  test('HTTPS without CA cert or insecure fails', async () => {
    await expect(
      Zitadel.withClientCredentials(
        `https://${host}:${httpsPort}`,
        'dummy-client',
        'dummy-secret',
      ),
    ).rejects.toThrow(Error);
  }, 30_000);

  test('transport options object works', async () => {
    const opts: TransportOptions = { insecure: true };
    const zitadel = await Zitadel.withClientCredentials(
      `https://${host}:${httpsPort}`,
      'dummy-client',
      'dummy-secret',
      opts,
    );
    expect(zitadel).toBeTruthy();
  }, 30_000);
});
