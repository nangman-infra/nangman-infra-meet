import { HttpStatus } from "@nestjs/common";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { AppConfig } from "../../config/app.config";
import {
  extractTestRunIdFromRequest,
  TEST_RUN_ID_HEADER,
} from "../request-context/request-context";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const TEST_RUNTIME_PERSISTENT_DATABASE_ERROR =
  "NODE_ENV=test must use in-memory persistence only. Set ALLOW_IN_MEMORY_PERSISTENCE=true so automated tests never connect to a persistent database.";
export const TEST_WRITE_PERSISTENT_DATABASE_ERROR = `Test-marked write requests are blocked while persistent database storage is enabled. Remove the ${TEST_RUN_ID_HEADER} header or re-run with ALLOW_IN_MEMORY_PERSISTENCE=true and no DATABASE_URL.`;

export function assertTestRuntimeUsesInMemoryPersistence(
  config: Pick<AppConfig, "nodeEnv" | "database">,
): void {
  if (config.nodeEnv !== "test") {
    return;
  }

  if (!config.database.allowInMemoryPersistence) {
    throw new Error(TEST_RUNTIME_PERSISTENT_DATABASE_ERROR);
  }
}

export function shouldUseInMemoryPersistence(
  config: Pick<AppConfig, "nodeEnv" | "database">,
): boolean {
  return config.nodeEnv === "test" || config.database.allowInMemoryPersistence;
}

export function createTestWriteProtectionMiddleware(
  config: AppConfig,
): RequestHandler {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (!WRITE_METHODS.has(request.method.toUpperCase())) {
      next();
      return;
    }

    const testRunId = extractTestRunIdFromRequest(request);
    if (!testRunId) {
      next();
      return;
    }

    if (config.database.allowInMemoryPersistence) {
      next();
      return;
    }

    if (!config.database.url && !config.database.directUrl) {
      next();
      return;
    }

    response.status(HttpStatus.FORBIDDEN).json({
      success: false,
      data: null,
      error: {
        code: HttpStatus.FORBIDDEN,
        message: TEST_WRITE_PERSISTENT_DATABASE_ERROR,
        path: request.originalUrl,
        timestamp: new Date().toISOString(),
      },
    });
  };
}
