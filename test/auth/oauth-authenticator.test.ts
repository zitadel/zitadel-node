// file: test/auth/oauth-authenticator.test.ts
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

export function withOauthContainer(
  defineTests: (oauthHost: string) => void,
): void {
  let container: StartedTestContainer;
  let oauthHost = '';

  // Outer describe ensures test registration happens after setup
  describe('with mock OAuth2 server', () => {
    beforeAll(async () => {
      container = await new GenericContainer(
        'ghcr.io/navikt/mock-oauth2-server:2.1.10',
      )
        .withExposedPorts(8080)
        .withWaitStrategy(Wait.forHttp('/', 8080).forStatusCode(405))
        .start();

      oauthHost = `http://${container.getHost()}:${container.getMappedPort(8080)}`;
    }, 30_000);

    afterAll(async () => {
      await container.stop();
    });

    defineTestsProxy(defineTests);
  });

  // Proxy defers test registration until after `oauthHost` is assigned
  function defineTestsProxy(fn: (oauthHost: string) => void) {
    beforeAll(() => {
      if (!oauthHost) throw new Error('oauthHost not initialized');
      fn(oauthHost);
    });
  }
}
