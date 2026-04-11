import * as Joi from "joi";

export const DEFAULT_API_PREFIX = "api";
export const DEFAULT_BACKEND_PORT = 8_787;
export const DEFAULT_LOG_LEVEL = "info";
export const DEFAULT_RATE_LIMIT_LIMIT = 120;
export const DEFAULT_RATE_LIMIT_TTL_MS = 60_000;
export const DEFAULT_ALLOWED_ORIGINS = [
  buildOrigin("http:", "127.0.0.1", 8082),
  buildOrigin("http:", "localhost", 8082),
  buildOrigin("http:", "127.0.0.1", 3000),
  buildOrigin("http:", "localhost", 3000),
  buildOrigin("https:", "localhost", 3000),
  buildOrigin("https:", "m.localhost", 3000),
].join(",");

export const ENV_VALIDATION_SCHEMA = Joi.object({
  NODE_ENV: Joi.string().valid("development", "test", "production").default("development"),
  PORT: Joi.number().integer().port().default(DEFAULT_BACKEND_PORT),
  API_PREFIX: Joi.string().trim().min(1).default(DEFAULT_API_PREFIX),
  CORS_ORIGINS: Joi.string().allow("").default(DEFAULT_ALLOWED_ORIGINS),
  DATABASE_URL: Joi.string().trim().allow("").default(""),
  DATABASE_URL_DIRECT: Joi.string().trim().allow("").default(""),
  DATABASE_POOL_MAX: Joi.number().integer().min(1).max(100).default(10),
  DATABASE_IDLE_TIMEOUT_MS: Joi.number().integer().min(1_000).default(30_000),
  ALLOW_IN_MEMORY_PERSISTENCE: Joi.boolean().default(false),
  RATE_LIMIT_TTL_MS: Joi.number().integer().min(1_000).default(DEFAULT_RATE_LIMIT_TTL_MS),
  RATE_LIMIT_LIMIT: Joi.number().integer().min(1).default(DEFAULT_RATE_LIMIT_LIMIT),
  LOG_LEVEL: Joi.string().valid("error", "warn", "info", "debug").default(DEFAULT_LOG_LEVEL),
});

function buildOrigin(
  protocol: "http:" | "https:",
  hostname: string,
  port: number,
): string {
  const url = new URL("https://localhost");
  url.protocol = protocol;
  url.hostname = hostname;
  url.port = `${port}`;

  return url.toString().replace(/\/$/, "");
}
