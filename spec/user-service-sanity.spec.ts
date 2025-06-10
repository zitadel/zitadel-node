import crypto from 'crypto';
import Zitadel from '../src/index.js';
// noinspection ES6PreferShortImport
import {
  UserServiceAddHumanUserResponse,
  UserServiceUser,
} from '../src/models/index.js';
import { ApiException } from '../src/api-exception.js';

/**
 * UserService Integration Tests
 *
 * This suite verifies the Zitadel UserService API's basic operations using a
 * personal access token.
 */
describe('UserServiceSanityCheckSpec', () => {
  let client: Zitadel;
  let user: UserServiceAddHumanUserResponse;

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
    const uniqueId = crypto.randomUUID().substring(0, 8);
    // This structure was correct based on the type `UserServiceAddHumanUserOperationRequest`.
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
    user = await client.users.userServiceAddHumanUser(request);
  });

  // This runs after each individual test
  afterEach(async () => {
    try {
      // This structure was correct based on the type `UserServiceDeleteUserRequest`.
      await client.users.userServiceDeleteUser({ userId: user.userId || '' });
    } catch (error) {
      // cleanup errors ignored
    }
  });

  it('retrieves the user details by id', async () => {
    // This structure was correct based on the type `UserServiceGetUserByIDRequest`.
    const response = await client.users.userServiceGetUserByID({
      userId: user.userId || '',
    });
    expect(response.user?.userId).toBe(user.userId);
  });

  it('includes the created user when listing all users', async () => {
    // CORRECTED: The payload must be nested inside a `userServiceListUsersRequest` object.
    const request = {
      userServiceListUsersRequest: {
        queries: [],
      },
    };
    const response = await client.users.userServiceListUsers(request);
    const userIds = response.result?.map(
      (userItem: UserServiceUser) => userItem.userId,
    );
    expect(userIds).toContain(user.userId);
  });

  it('updates the user email and reflects in get', async () => {
    const newEmail = `updated_${crypto.randomUUID().substring(0, 8)}@example.com`;

    // This structure was correct based on the type `UserServiceUpdateHumanUserOperationRequest`.
    await client.users.userServiceUpdateHumanUser({
      userId: user.userId || '',
      userServiceUpdateHumanUserRequest: {
        email: {
          email: newEmail,
        },
      },
    });

    const response = await client.users.userServiceGetUserByID({
      userId: user.userId || '',
    });
    expect(response.user?.human?.email?.email).toContain('updated');
  });

  it('raises an ApiException when retrieving a non-existent user', async () => {
    const nonExistentId = crypto.randomUUID();
    // This structure was correct based on the type `UserServiceGetUserByIDRequest`.
    await expect(
      client.users.userServiceGetUserByID({ userId: nonExistentId }),
    ).rejects.toThrow(ApiException);
  });
});
