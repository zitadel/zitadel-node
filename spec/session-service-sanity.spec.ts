import crypto from 'crypto';
import Zitadel from '../src/index.js';
// noinspection ES6PreferShortImport
import {
  SessionServiceChecks,
  SessionServiceCheckUser,
} from '../src/models/index.js';
// noinspection ES6PreferShortImport
import { ApiException } from '../src/api-exception.js';

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
describe('SessionServiceSanityCheckSpec', () => {
  let client: Zitadel;
  let sessionId: string;

  // This runs once before all tests in the suite
  beforeAll(() => {
    const validToken = process.env.AUTH_TOKEN as string;
    const baseUrl = process.env.BASE_URL as string;
    if (!validToken || !baseUrl) {
      throw new Error(
        'AUTH_TOKEN and BASE_URL environment variables must be set.',
      );
    }
    client = Zitadel.withAccessToken(baseUrl, validToken);
  });

  /**
   * @throws ApiException
   */
  beforeEach(async () => {
    const request = {
      sessionServiceCreateSessionRequest: {
        checks: {
          user: {
            loginName: 'johndoe',
          } as SessionServiceCheckUser,
        } as SessionServiceChecks,
        lifetime: '18000s',
      },
    };

    const response = await client.sessions.sessionServiceCreateSession(request);
    sessionId = response.sessionId || '';
  });

  afterEach(async () => {
    try {
      await client.sessions.sessionServiceDeleteSession({
        sessionId,
        sessionServiceDeleteSessionRequest: {},
      });
    } catch {
      // Ignore cleanup errors
    }
  });

  /**
   * @throws ApiException
   */
  it('testRetrievesTheSessionDetailsById', async () => {
    const response = await client.sessions.sessionServiceGetSession({
      sessionId,
    });
    expect(response.session?.id).toBe(sessionId);
  });

  /**
   * @throws ApiException
   */
  it('testIncludesTheCreatedSessionWhenListingAllSessions', async () => {
    const request = {
      sessionServiceListSessionsRequest: {
        queries: [],
      },
    };
    const response = await client.sessions.sessionServiceListSessions(request);
    const ids = response.sessions?.map((session) => session.id);
    expect(ids).toContain(sessionId);
  });

  /**
   * @throws ApiException
   */
  it('testUpdatesTheSessionLifetimeAndReturnsANewToken', async () => {
    const response = await client.sessions.sessionServiceSetSession({
      sessionId: sessionId,
      sessionServiceSetSessionRequest: {
        lifetime: '36000s',
      },
    });
    expect(typeof response.sessionToken).toBe('string');
  });

  it('testRaisesAnApiExceptionWhenRetrievingANonExistentSession', async () => {
    const nonExistentId = crypto.randomUUID();
    await expect(
      client.sessions.sessionServiceGetSession({ sessionId: nonExistentId }),
    ).rejects.toThrow(ApiException);
  });
});
