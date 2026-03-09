import * as path from 'path';
import { fileURLToPath } from 'url';
import { Agent, ProxyAgent } from 'undici';
import { buildDispatcher } from '../src/transport-options.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

describe('TransportOptionsTest', () => {
  test('testUndefinedReturnsUndefined', async () => {
    const result = await buildDispatcher(undefined);
    expect(result).toBeUndefined();
  });

  test('testEmptyReturnsUndefined', async () => {
    const result = await buildDispatcher({});
    expect(result).toBeUndefined();
  });

  test('testInsecureReturnsAgent', async () => {
    const result = await buildDispatcher({ insecure: true });
    expect(result).toBeInstanceOf(Agent);
  });

  test('testCaCertPathReturnsAgent', async () => {
    const certPath = path.join(FIXTURES_DIR, 'ca.pem');
    const result = await buildDispatcher({ caCertPath: certPath });
    expect(result).toBeInstanceOf(Agent);
  });

  test('testProxyUrlReturnsProxyAgent', async () => {
    const result = await buildDispatcher({
      proxyUrl: 'http://proxy:3128',
    });
    expect(result).toBeInstanceOf(ProxyAgent);
  });

  test('testInsecureTakesPrecedenceOverCaCertPath', async () => {
    const result = await buildDispatcher({
      insecure: true,
      caCertPath: '/nonexistent/ca.pem',
    });
    expect(result).toBeInstanceOf(Agent);
  });
});
