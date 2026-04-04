import { registerAs } from "@nestjs/config";
import {
  DEFAULT_API_PREFIX,
  DEFAULT_BACKEND_PORT,
  DEFAULT_LOG_LEVEL,
  DEFAULT_RATE_LIMIT_LIMIT,
  DEFAULT_RATE_LIMIT_TTL_MS,
} from "./env.validation";

export interface AppConfig {
  readonly apiPrefix: string;
  readonly corsOrigins: string[];
  readonly database: {
    readonly allowInMemoryPersistence: boolean;
    readonly directUrl: string | null;
    readonly idleTimeoutMs: number;
    readonly poolMax: number;
    readonly url: string | null;
  };
  readonly logLevel: "error" | "warn" | "info" | "debug";
  readonly nodeEnv: "development" | "test" | "production";
  readonly port: number;
  readonly rateLimit: {
    readonly limit: number;
    readonly ttlMs: number;
  };
}

export const appConfig = registerAs(
  "app",
  (): AppConfig => ({
    apiPrefix: process.env.API_PREFIX ?? DEFAULT_API_PREFIX,
    corsOrigins: parseCsv(process.env.CORS_ORIGINS),
    database: {
      allowInMemoryPersistence: parseBoolean(
        process.env.ALLOW_IN_MEMORY_PERSISTENCE,
      ),
      directUrl: parseOptionalString(process.env.DATABASE_URL_DIRECT),
      idleTimeoutMs: Number.parseInt(
        process.env.DATABASE_IDLE_TIMEOUT_MS ?? "30000",
        10,
      ),
      poolMax: Number.parseInt(process.env.DATABASE_POOL_MAX ?? "10", 10),
      url: parseOptionalString(process.env.DATABASE_URL),
    },
    logLevel: (process.env.LOG_LEVEL as AppConfig["logLevel"] | undefined) ?? DEFAULT_LOG_LEVEL,
    nodeEnv:
      (process.env.NODE_ENV as AppConfig["nodeEnv"] | undefined) ??
      "development",
    port: Number.parseInt(process.env.PORT ?? `${DEFAULT_BACKEND_PORT}`, 10),
    rateLimit: {
      limit: Number.parseInt(process.env.RATE_LIMIT_LIMIT ?? `${DEFAULT_RATE_LIMIT_LIMIT}`, 10),
      ttlMs: Number.parseInt(process.env.RATE_LIMIT_TTL_MS ?? `${DEFAULT_RATE_LIMIT_TTL_MS}`, 10),
    },
  }),
);

function parseCsv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parseOptionalString(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseBoolean(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}
