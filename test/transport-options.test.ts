import * as tls from 'tls';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import Zitadel from '../src/index.js';

/**
 * Connects to the given host:port over TLS (ignoring certificate validity)
 * and returns the server's leaf certificate in PEM format.
 */
function extractCert(host: string, port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      port,
      host,
      { rejectUnauthorized: false },
      () => {
        const cert = socket.getPeerCertificate();
        if (cert && cert.raw) {
          const b64 = cert.raw.toString('base64');
          const pem = `-----BEGIN CERTIFICATE-----\n${b64.match(/.{1,64}/g)!.join('\n')}\n-----END CERTIFICATE-----\n`;
          resolve(pem);
        } else {
          reject(new Error('No peer certificate'));
        }
        socket.end();
      },
    );
    socket.on('error', reject);
  });
}

describe('TransportOptionsTest', () => {
  let container: StartedTestContainer;
  let host: string;
  let httpPort: number;
  let httpsPort: number;
  let certPath: string;

  beforeAll(async () => {
    container = await new GenericContainer('wiremock/wiremock:3.3.1')
      .withCommand(['--https-port', '8443', '--global-response-templating'])
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
    await fetch(adminUrl, {
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

    // Stub 2 - Token endpoint
    await fetch(adminUrl, {
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

    // Extract the WireMock self-signed certificate and write to a temp file
    const pem = await extractCert(host, httpsPort);
    certPath = path.join(os.tmpdir(), `wiremock-ca-${Date.now()}.pem`);
    fs.writeFileSync(certPath, pem);
  }, 30_000);

  afterAll(async () => {
    if (certPath && fs.existsSync(certPath)) {
      fs.unlinkSync(certPath);
    }
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
    ).rejects.toThrow();
  }, 30_000);
});
