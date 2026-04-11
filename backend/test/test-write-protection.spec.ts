import type { AppConfig } from "../src/config/app.config";
import { TEST_RUN_ID_HEADER } from "../src/common/request-context/request-context";
import {
  assertTestRuntimeUsesInMemoryPersistence,
  createTestWriteProtectionMiddleware,
  shouldUseInMemoryPersistence,
  TEST_RUNTIME_PERSISTENT_DATABASE_ERROR,
  TEST_WRITE_PERSISTENT_DATABASE_ERROR,
} from "../src/common/test-safety/test-write-protection";

function createConfig(overrides?: Partial<AppConfig>): AppConfig {
  return {
    apiPrefix: "api",
    corsOrigins: [],
    database: {
      allowInMemoryPersistence: false,
      directUrl: "postgres://direct",
      idleTimeoutMs: 30_000,
      poolMax: 10,
      url: "postgres://app",
    },
    logLevel: "error",
    nodeEnv: "development",
    port: 8_787,
    rateLimit: {
      limit: 120,
      ttlMs: 60_000,
    },
    ...overrides,
  };
}

describe("test write protection", () => {
  it("rejects test runtime boot when in-memory persistence is disabled", () => {
    const config = createConfig({
      nodeEnv: "test",
      database: {
        allowInMemoryPersistence: false,
        directUrl: "postgres://direct",
        idleTimeoutMs: 30_000,
        poolMax: 10,
        url: "postgres://app",
      },
    });

    expect(() => assertTestRuntimeUsesInMemoryPersistence(config)).toThrow(
      TEST_RUNTIME_PERSISTENT_DATABASE_ERROR,
    );
  });

  it("forces in-memory persistence for test runtime even when database urls exist", () => {
    const config = createConfig({
      nodeEnv: "test",
      database: {
        allowInMemoryPersistence: true,
        directUrl: "postgres://direct",
        idleTimeoutMs: 30_000,
        poolMax: 10,
        url: "postgres://app",
      },
    });

    expect(() => assertTestRuntimeUsesInMemoryPersistence(config)).not.toThrow();
    expect(shouldUseInMemoryPersistence(config)).toBe(true);
  });

  it("blocks test-marked write requests against a persistent database", () => {
    const middleware = createTestWriteProtectionMiddleware(createConfig());
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const next = jest.fn();

    middleware(
      {
        method: "POST",
        originalUrl: "/api/v1/meetings",
        header: (name: string): string | undefined =>
          ({
            [TEST_RUN_ID_HEADER]: "backend-e2e",
          })[name.toLowerCase()],
      } as never,
      { status, json } as never,
      next,
    );

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: TEST_WRITE_PERSISTENT_DATABASE_ERROR,
        }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("allows unmarked write requests to continue", () => {
    const middleware = createTestWriteProtectionMiddleware(createConfig());
    const next = jest.fn();

    middleware(
      {
        method: "POST",
        originalUrl: "/api/v1/meetings",
        header: () => undefined,
      } as never,
      {} as never,
      next,
    );

    expect(next).toHaveBeenCalled();
  });
});
