// noinspection DuplicatedCode
import { inspect } from "util";
import { generateKeyPairSync } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
// noinspection ES6PreferShortImport
import { WebTokenAuthenticator } from "../../src/auth/web-token-authenticator.js";
import { DefaultApiClient } from "../../src/default-api-client.js";
import { TransportOptions } from "../../src/transport-options.js";
import { withOauthContainer } from "./oauth-authenticator-test.js";

const HOST = "https://example.zitadel.cloud";

const getPrivateKey = (): string =>
  generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  }).privateKey;

/** Returns what the callback throws, failing when it returns. */
const thrown = (action: () => unknown): unknown => {
  try {
    action();
  } catch (e) {
    return e;
  }
  throw new Error("Expected the call to throw");
};

describe("WebTokenAuthenticatorTest", () => {
  const keyFiles: string[] = [];

  const keyFile = (content: string): string => {
    const file = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), "zitadel-key-")),
      "key.json",
    );
    fs.writeFileSync(file, content, "utf-8");
    keyFiles.push(file);
    return file;
  };

  afterAll(() => {
    for (const file of keyFiles) {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    }
  });

  withOauthContainer((getOauthHost) => {
    const build = (
      configure: (
        builder: ReturnType<typeof WebTokenAuthenticator.builder>,
      ) => ReturnType<typeof WebTokenAuthenticator.builder>,
    ): WebTokenAuthenticator => {
      const authenticator = configure(
        WebTokenAuthenticator.builder(getOauthHost(), "1", getPrivateKey()),
      ).build();
      authenticator.setApiClient(
        new DefaultApiClient(TransportOptions.builder().build()),
      );
      return authenticator;
    };

    const assertRefreshes = async (
      authenticator: WebTokenAuthenticator,
    ): Promise<void> => {
      expect(await authenticator.getAuthToken()).not.toBeFalsy();
      const token = await authenticator.refreshToken();
      expect(token).not.toBeFalsy();
      expect(token).toBe(await authenticator.getAuthToken());
      expect(authenticator.getHost()).toBe(getOauthHost());
      expect(await authenticator.refreshToken()).not.toEqual(
        await authenticator.refreshToken(),
      );
    };

    test("testRefreshToken", async () => {
      await assertRefreshes(
        build((builder) => builder.scopes("openid", "foo")),
      );
    }, 30000);

    test("testRefreshTokenWithRS256", async () => {
      await assertRefreshes(build((builder) => builder.jwtAlgorithm("RS256")));
    }, 30000);

    test("testRefreshTokenWithExtendedLifetime", async () => {
      await assertRefreshes(
        build((builder) => builder.tokenLifetimeSeconds(86400)),
      );
    }, 40000);

    it("redacts secrets in inspect and JSON output", async () => {
      const authenticator = build((builder) => builder);
      const accessToken = await authenticator.refreshToken();

      const inspected = inspect(authenticator);
      const serialised = JSON.stringify(authenticator);

      expect(inspected).not.toContain(accessToken);
      expect(inspected).toContain("***");
      expect(serialised).not.toContain(accessToken);
      expect(serialised).toContain("***");
    }, 30000);
  });

  it("loads a Zitadel key file", () => {
    const file = keyFile(
      JSON.stringify({
        type: "serviceaccount",
        keyId: "key-1",
        userId: "user-1",
        key: getPrivateKey(),
      }),
    );

    expect(WebTokenAuthenticator.fromJson(HOST, file).getHost()).toBe(HOST);
  });

  it("rejects a missing or malformed key file with a TypeError", () => {
    const files = [
      path.join(os.tmpdir(), "absent-zitadel-key.json"),
      keyFile("not json"),
      keyFile("[]"),
      keyFile('{"userId":"user-1","keyId":"key-1"}'),
      keyFile('{"userId":"user-1","keyId":"key-1","key":"not a pem"}'),
    ];

    for (const file of files) {
      const error = thrown(() => WebTokenAuthenticator.fromJson(HOST, file));
      expect((error as Error).constructor).toBe(TypeError);
    }
  });

  it("rejects invalid builder arguments", () => {
    const pem = getPrivateKey();
    const builder = WebTokenAuthenticator.builder(HOST, "user-1", pem);

    for (const action of [
      () => WebTokenAuthenticator.builder(HOST, "", pem),
      () => WebTokenAuthenticator.builder(HOST, "user-1", "not a pem"),
      () => builder.jwtAlgorithm("HS256"),
      () => builder.keyId(""),
    ]) {
      expect((thrown(action) as Error).constructor).toBe(TypeError);
    }
    expect(
      (thrown(() => builder.tokenLifetimeSeconds(0)) as Error).constructor,
    ).toBe(RangeError);
  });
});
