import * as Joi from "joi";

export const DEFAULT_API_PREFIX = "api";
export const DEFAULT_BACKEND_PORT = 8_787;
export const DEFAULT_LOG_LEVEL = "info";
export const DEFAULT_RATE_LIMIT_LIMIT = 120;
export const DEFAULT_RATE_LIMIT_TTL_MS = 60_000;
export const DEFAULT_ALLOWED_ORIGINS =
  "http://127.0.0.1:8082,http://localhost:8082,http://127.0.0.1:3000,http://localhost:3000,https://localhost:3000,https://m.localhost:3000";

export const ENV_VALIDATION_SCHEMA = Joi.object({
  NODE_ENV: Joi.string().valid("development", "test", "production").default("development"),
  PORT: Joi.number().integer().port().default(DEFAULT_BACKEND_PORT),
  API_PREFIX: Joi.string().trim().min(1).default(DEFAULT_API_PREFIX),
  CORS_ORIGINS: Joi.string().allow("").default(DEFAULT_ALLOWED_ORIGINS),
  RATE_LIMIT_TTL_MS: Joi.number().integer().min(1_000).default(DEFAULT_RATE_LIMIT_TTL_MS),
  RATE_LIMIT_LIMIT: Joi.number().integer().min(1).default(DEFAULT_RATE_LIMIT_LIMIT),
  LOG_LEVEL: Joi.string().valid("error", "warn", "info", "debug").default(DEFAULT_LOG_LEVEL),
});
