// file: test/auth/oauth-authenticator-test.ts
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";

/**
 * Starts the mock OAuth2 server (ghcr.io/navikt/mock-oauth2-server) once for
 * the tests defined inside `defineTests`, and hands them its base URL.
 *
 * This file is a shared helper, not a test file: the OAuth contract tests
 * live in client-credentials-authenticator.test.ts.
 */
export function withOauthContainer(
  defineTests: (getOauthHost: () => string) => void,
): void {
  let container: StartedTestContainer;
  let oauthHost = "";

  beforeAll(async () => {
    container = await new GenericContainer(
      "ghcr.io/navikt/mock-oauth2-server:2.1.10",
    )
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forHttp("/", 8080).forStatusCode(405))
      .start();
    // noinspection HttpUrlsUsage
    oauthHost = `http://${container.getHost()}:${container.getMappedPort(8080)}`;
  }, 30_000);

  afterAll(async () => {
    await container.stop();
  });

  describe("with mock OAuth2 server", () => {
    defineTests(() => oauthHost);
  });
}
