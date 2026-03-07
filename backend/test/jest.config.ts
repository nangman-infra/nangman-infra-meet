import type { Config } from "jest";

const config: Config = {
  rootDir: "..",
  moduleFileExtensions: ["js", "json", "ts"],
  testEnvironment: "node",
  testRegex: "test/.*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.json",
      },
    ],
  },
  setupFiles: ["<rootDir>/test/setup-env.ts"],
  collectCoverageFrom: ["src/**/*.ts"],
  coverageDirectory: "./coverage",
};

export default config;
