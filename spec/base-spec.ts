import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { afterAll, beforeAll } from '@jest/globals';
import { setTimeout } from 'timers/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Defines the shape of the context object provided to tests.
 */
export interface TestContext {
  authToken: string;
  jwtKey: string;
  baseUrl: string;
}

/**
 * Abstract base class for integration tests that interact with a Docker
 * Compose stack.
 *
 * This class handles the lifecycle of a Docker Compose environment,
 * bringing it up before tests run and tearing it down afterward. It also
 * provides mechanisms to load specific data (like authentication tokens
 * and JWT keys) from files and make them accessible via protected getters
 * for use in concrete test implementations.
 */
export abstract class AbstractIntegrationTest {
  /**
   * The authentication token loaded from a file.
   */
  protected static authToken: string | null = null;
  /**
   * The absolute path to the JWT key file.
   */
  protected static jwtKey: string | null = null;
  /**
   * The base URL for the services.
   */
  protected static baseUrl: string | null = null;
  /**
   * The absolute path to the docker-compose.yaml file.
   */
  private static composeFilePath: string = path.resolve(
    __dirname,
    '../etc/docker-compose.yaml',
  );
  /**
   * The directory containing the docker-compose.yaml file.
   */
  private static composeFileDir: string | null = null;

  /**
   * Sets up the test environment before the first test in the class runs.
   * This includes bringing up the Docker Compose stack and exposing
   * necessary data.
   */
  public static async setUpBeforeClass(): Promise<void> {
    this.composeFileDir = path.dirname(this.composeFilePath);

    console.log('Bringing up Docker Compose stack...');
    try {
      const command = `docker compose -f "${this.composeFilePath}" up --detach --no-color --quiet-pull`;
      execSync(command, { stdio: 'inherit' });
      console.log('Docker Compose stack is up.');
    } catch (error: unknown) {
      let errorMessage = 'Failed to bring up Docker Compose stack.';
      if (error instanceof Error) {
        errorMessage += `\n${error.message}`;
      }
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    this.loadFileContentIntoProperty('zitadel_output/pat.txt', 'authToken');

    const jwtKeyFilePath = path.join(
      this.composeFileDir,
      'zitadel_output/sa-key.json',
    );
    if (!fs.existsSync(jwtKeyFilePath)) {
      throw new Error(`JWT Key file not found at path: ${jwtKeyFilePath}`);
    }
    this.jwtKey = jwtKeyFilePath;
    console.log(`Loaded JWT_KEY path: ${this.jwtKey}`);

    this.baseUrl = 'http://localhost:8099';
    console.log(`Exposed BASE_URL as: ${this.baseUrl}`);

    console.log('Sleeping for 20 seconds to allow services to initialize...');
    await setTimeout(20000);
    console.log('Sleep finished.');
  }

  /**
   * Reads the content of a file relative to the docker-compose file directory and
   * assigns it to a specified static property of this class.
   * This method is intended for loading *content*, not paths.
   */
  private static loadFileContentIntoProperty(
    relativePath: string,
    propertyName: 'authToken',
  ): void {
    if (!this.composeFileDir) {
      throw new Error('Compose file directory is not initialized.');
    }
    const filePath = path.join(this.composeFileDir, relativePath);
    if (fs.existsSync(filePath)) {
      this[propertyName] = fs.readFileSync(filePath, 'utf-8').trim();
      console.log(`Loaded ${filePath} content into property: ${propertyName}`);
    } else {
      throw new Error(
        `File not found for property '${propertyName}': ${filePath}`,
      );
    }
  }

  /**
   * Tears down the test environment after all tests in the class have run.
   * This includes stopping and removing the Docker Compose stack.
   */
  public static tearDownAfterClass(): void {
    console.log('Tearing down Docker Compose stack...');
    if (fs.existsSync(this.composeFilePath)) {
      try {
        const command = `docker compose -f "${this.composeFilePath}" down -v`;
        execSync(command, { stdio: 'inherit' });
        console.log('Docker Compose stack torn down.');
      } catch (error: unknown) {
        let errorMessage = 'Warning: Failed to tear down Docker Compose stack.';
        if (error instanceof Error) {
          errorMessage += `\n${error.message}`;
        }
        console.error(errorMessage);
      }
    } else {
      console.warn(
        'Docker Compose file path not initialized or file does not exist, skipping tear down.',
      );
    }
  }

  /**
   * Retrieves the authentication token.
   */
  public static getAuthToken(): string {
    if (!this.authToken) throw new Error('Auth token is not available.');
    return this.authToken;
  }

  /**
   * Retrieves the absolute path to the JWT key file.
   */
  public static getJwtKey(): string {
    if (!this.jwtKey) throw new Error('JWT key is not available.');
    return this.jwtKey;
  }

  /**
   * Retrieves the base URL.
   */
  public static getBaseUrl(): string {
    if (!this.baseUrl) throw new Error('Base URL is not available.');
    return this.baseUrl;
  }
}

/**
 * A Jest hook that manages the integration test environment lifecycle.
 * It returns a Proxy object that allows for a `const` context declaration
 * in your test files.
 */
export function useIntegrationEnvironment() {
  let internalContext: TestContext | null = null;

  beforeAll(async () => {
    await AbstractIntegrationTest.setUpBeforeClass();
    internalContext = {
      authToken: AbstractIntegrationTest.getAuthToken(),
      jwtKey: AbstractIntegrationTest.getJwtKey(),
      baseUrl: AbstractIntegrationTest.getBaseUrl(),
    };
  }, 60000);

  afterAll(() => {
    AbstractIntegrationTest.tearDownAfterClass();
    internalContext = null;
  }, 60000);

  const contextProxy = new Proxy<TestContext>({} as TestContext, {
    get(_target, prop: keyof TestContext) {
      if (!internalContext) {
        throw new Error(
          `The test context is not yet available. You can only access its properties (like '${String(prop)}') inside an 'it' block or a 'beforeEach'/'afterEach' hook.`,
        );
      }
      return internalContext[prop];
    },
  });

  return { context: contextProxy };
}
