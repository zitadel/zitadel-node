import crypto from 'crypto';
import Zitadel from '../src/index.js';
// noinspection ES6PreferShortImport
import {
  SessionServiceChecks,
  SessionServiceCheckUser,
} from '../src/models/index.js';
import { ApiException } from '../src/api-exception.js';

/**
 * SessionService Integration Tests
 *
 * This suite verifies the Zitadel SessionService API's basic operations using a
 * personal access token.
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

  // This runs before each individual test
  beforeEach(async () => {
    // This structure was correct based on the type `SessionServiceCreateSessionOperationRequest`.
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

  // This runs after each individual test
  afterEach(async () => {
    try {
      // CORRECTED: The type `SessionServiceDeleteSessionOperationRequest` requires
      // both a `sessionId` and an empty `sessionServiceDeleteSessionRequest` object.
      await client.sessions.sessionServiceDeleteSession({
        sessionId,
        sessionServiceDeleteSessionRequest: {},
      });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('retrieves the session details by id', async () => {
    // This structure was correct based on the type `SessionServiceGetSessionRequest`.
    const response = await client.sessions.sessionServiceGetSession({
      sessionId,
    });
    expect(response.session?.id).toBe(sessionId);
  });

  it('includes the created session when listing all sessions', async () => {
    // CORRECTED: The payload must be nested inside a `sessionServiceListSessionsRequest` object.
    const request = {
      sessionServiceListSessionsRequest: {
        queries: [],
      },
    };
    const response = await client.sessions.sessionServiceListSessions(request);
    const ids = response.sessions?.map((session) => session.id);
    expect(ids).toContain(sessionId);
  });

  it('updates the session lifetime and returns a new token', async () => {
    // This structure was correct based on the type `SessionServiceSetSessionOperationRequest`.
    const response = await client.sessions.sessionServiceSetSession({
      sessionId: sessionId,
      sessionServiceSetSessionRequest: {
        lifetime: '36000s',
      },
    });
    expect(typeof response.sessionToken).toBe('string');
  });

  it('raises an ApiException when retrieving a non-existent session', async () => {
    const nonExistentId = crypto.randomUUID();
    // This structure was correct based on the type `SessionServiceGetSessionRequest`.
    await expect(
      client.sessions.sessionServiceGetSession({ sessionId: nonExistentId }),
    ).rejects.toThrow(ApiException);
  });
});
