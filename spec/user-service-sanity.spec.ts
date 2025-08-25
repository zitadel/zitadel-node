import crypto from 'crypto';
import Zitadel from '../src/index.js';
// noinspection ES6PreferShortImport
import { UserServiceAddHumanUserResponse, UserServiceUser, } from '../src/models/index.js';
// noinspection ES6PreferShortImport
import { ApiException } from '../src/api-exception.js';
import { useIntegrationEnvironment } from './base-spec.js';

/**
 * UserService Integration Tests
 *
 * This suite verifies the Zitadel UserService API's basic operations using a
 * personal access token:
 *
 * 1. Create a human user
 * 2. Retrieve the user by ID
 * 3. List users and ensure the created user appears
 * 4. Update the user's email and confirm the change
 * 5. Error when retrieving a non-existent user
 *
 * Each test runs in isolation: a new user is created before each test (beforeEach)
 * and removed after (afterEach) to ensure a clean state.
 */
describe('UserServiceSanityCheckSpec', () => {
  const { context } = useIntegrationEnvironment();
  let client: Zitadel;
  let user: UserServiceAddHumanUserResponse;

  // This runs once before all tests in the suite
  beforeAll(() => {
    client = Zitadel.withAccessToken(context.baseUrl, context.authToken);
  });

  /**
   * Create a new human user before each test.
   *
   * @throws ApiException on API error
   */
  beforeEach(async () => {
    const uniqueId = crypto.randomUUID().substring(0, 8);
    const request = {
      userServiceAddHumanUserRequest: {
        username: `user_${uniqueId}`,
        profile: {
          givenName: 'John',
          familyName: 'Doe',
        },
        email: {
          email: `johndoe_${uniqueId}@example.com`,
        },
      },
    };
    user = await client.users.addHumanUser(request);
  });

  /**
   * Remove the created human user after each test.
   */
  afterEach(async () => {
    try {
      await client.users.deleteUser({
        userServiceDeleteUserRequest: { userId: user.userId || '' },
      });
    } catch {
      // cleanup errors ignored
    }
  });

  /**
   * Retrieve the user by ID and verify the returned ID matches.
   *
   * @throws ApiException on API error
   */
  it('testRetrievesTheUserDetailsById', async () => {
    const response = await client.users.getUserByID({
      userServiceGetUserByIDRequest: {
        userId: user.userId || '',
      },
    });
    expect(response.user?.userId).toBe(user.userId);
  });

  /**
   * List all human users and verify the created user appears in the list.
   *
   * @throws ApiException on API error
   */
  it('testIncludesTheCreatedUserWhenListingAllUsers', async () => {
    const request = {
      userServiceListUsersRequest: {
        queries: [],
      },
    };
    const response = await client.users.listUsers(request);
    const userIds = response.result?.map(
      (userItem: UserServiceUser) => userItem.userId,
    );
    expect(userIds).toContain(user.userId);
  });

  /**
   * Update the user's email and verify via a get call that the change was applied.
   *
   * @throws ApiException on API error
   */
  it('testUpdatesTheUserEmailAndReflectsInGet', async () => {
    const newEmail = `updated_${crypto.randomUUID().substring(0, 8)}@example.com`;

    await client.users.updateUser({
      userServiceUpdateUserRequest: {
        userId: user.userId || '',
        human: {
          email: { email: newEmail },
        },
      },
    });

    const response = await client.users.getUserByID({
      userServiceGetUserByIDRequest: {
        userId: user.userId || '',
      },
    });
    expect(response.user?.human?.email?.email).toContain('updated');
  });

  /**
   * Attempt to retrieve a non-existent user and expect an ApiException.
   */
  it('testRaisesAnApiExceptionWhenRetrievingNonExistentUser', async () => {
    const nonExistentId = crypto.randomUUID();
    await expect(
      client.users.getUserByID({
        userServiceGetUserByIDRequest: { userId: nonExistentId },
      }),
    ).rejects.toThrow(ApiException);
  });
});
