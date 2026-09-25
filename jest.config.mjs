export default {
  preset: "ts-jest/presets/default-esm",
  transform: {
    "^.+\\.m?[tj]sx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "tsconfig.jest.json",
        diagnostics: false,
      },
    ],
  },
  testEnvironment: "node",
  testMatch: ["**/*.+(spec|test).[tj]s?(x)"],
  moduleFileExtensions: [
    "ts",
    "tsx",
    "js",
    "mjs",
    "jsx",
    "mts",
    "json",
    "node",
  ],
  // .claude/worktrees holds throwaway checkouts of this same repo, each with
  // its own copy of spec/. Without this they match testMatch too, so a run
  // executes the integration specs once per leftover worktree, against code
  // that is not the working tree's.
  testPathIgnorePatterns: [
    "/node_modules/",
    "/frontend/",
    "/dist/",
    "/.claude/",
  ],
  resetModules: false,
  collectCoverage: true,
  coverageDirectory: "./build/coverage",
  collectCoverageFrom: ["src/**/*.{ts,tsx,js,jsx}", "!src/**/*.d.ts"],
  coverageReporters: ["clover", "cobertura", "lcov"],
  coveragePathIgnorePatterns: ["/dist/", "/node_modules/"],
  testTimeout: 60000,
  globalSetup: "./test/setup.js",
  extensionsToTreatAsEsm: [".ts", ".tsx", ".mts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^#transport$": "<rootDir>/src/default-api-client.ts",
  },
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "./build/reports",
        outputName: "junit.xml",
      },
    ],
  ],
};
