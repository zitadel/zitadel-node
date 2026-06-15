import crypto from "crypto";
import Zitadel from "../src/index.js";
import { PersonalAccessAuthenticator } from "../src/auth/personal-access-authenticator.js";
// noinspection ES6PreferShortImport
import {
  SessionServiceChecks,
  SessionServiceCheckUser,
} from "../src/models/index.js";
// noinspection ES6PreferShortImport
import { ApiException } from "../src/api-exception.js";
import { useIntegrationEnvironment } from "./base-spec.js";

/**
 * SessionService Integration Tests
 *
 * This suite verifies the Zitadel SessionService API's basic operations using a
 * personal access token:
 *
 * 1. Create a session with specified checks and lifetime
 * 2. Retrieve the session by ID
 * 3. List sessions and ensure the created session appears
 * 4. Update the session's lifetime and confirm a new token is returned
 * 5. Error when retrieving a non-existent session
 *
 * Each test runs in isolation: a new session is created before each test (beforeEach)
 * and deleted after (afterEach) to ensure a clean state.
 */
describe("SessionServiceSanityCheckSpec", () => {
  const { context } = useIntegrationEnvironment();
  let client: Zitadel;
  let sessionId: string;

  // This runs once before all tests in the suite
  beforeAll(() => {
    client = Zitadel.withAuthenticator(
      new PersonalAccessAuthenticator(context.baseUrl, context.authToken),
    );
  });

  /**
   * @throws ApiException
   */
  beforeEach(async () => {
    const username = crypto.randomUUID().substring(0, 8);
    await client.userService.addHumanUser({
      username: username,
      profile: {
        givenName: "John",
        familyName: "Doe",
      },
      email: {
        email: `johndoe_${username}@example.com`,
      },
    });

    const response = await client.sessionService.createSession({
      checks: {
        user: {
          loginName: username,
        } as SessionServiceCheckUser,
      } as SessionServiceChecks,
      lifetime: "18000s",
    });
    sessionId = response.sessionId || "";
  });

  afterEach(async () => {
    try {
      await client.sessionService.deleteSession({ sessionId });
    } catch {
      // Ignore cleanup errors
    }
  });

  /**
   * @throws ApiException
   */
  it("testRetrievesTheSessionDetailsById", async () => {
    const response = await client.sessionService.getSession({ sessionId });
    expect(response.session?.id).toBe(sessionId);
  });

  /**
   * @throws ApiException
   */
  it("testIncludesTheCreatedSessionWhenListingAllSessions", async () => {
    const response = await client.sessionService.listSessions({ queries: [] });
    const ids = response.sessions?.map((session) => session.id);
    expect(ids).toContain(sessionId);
  });

  /**
   * @throws ApiException
   */
  it("testUpdatesTheSessionLifetimeAndReturnsANewToken", async () => {
    const response = await client.sessionService.setSession({
      sessionId: sessionId,
      lifetime: "36000s",
    });
    expect(typeof response.sessionToken).toBe("string");
  });

  it("testRaisesAnApiExceptionWhenRetrievingANonExistentSession", async () => {
    const nonExistentId = crypto.randomUUID();
    await expect(
      client.sessionService.getSession({ sessionId: nonExistentId }),
    ).rejects.toThrow(ApiException);
  });
});
