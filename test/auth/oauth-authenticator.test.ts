import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

export function withOauthContainer(
  defineTests: (ctx: string) => void,
): () => void {
  return () => {
    let ctx: {
      oauthHost: string;
      container: StartedTestContainer;
    };

    beforeAll(async () => {
      const container = await new GenericContainer(
        'ghcr.io/navikt/mock-oauth2-server:2.1.10',
      )
        .withExposedPorts(8080)
        .withWaitStrategy(Wait.forHttp('/', 8080).forStatusCode(405))
        .start();

      // noinspection HttpUrlsUsage
      const oauthHost = `http://${container.getHost()}:${container.getMappedPort(8080)}`;
      ctx = { oauthHost, container };
    }, 30_000);

    afterAll(async () => {
      await ctx.container.stop();
    });

    describe('OAuth2 server is ready', () => {
      beforeAll(() => {
        defineTests(ctx.oauthHost);
      });
    });
  };
}
