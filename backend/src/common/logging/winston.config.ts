import type { WinstonModuleOptions } from "nest-winston";
import { utilities as nestWinstonUtilities } from "nest-winston";
import { format, transports } from "winston";

const { combine, errors, json, printf, timestamp } = format;

export function createWinstonLoggerOptions(
  level: "error" | "warn" | "info" | "debug",
  nodeEnv: "development" | "test" | "production",
): WinstonModuleOptions {
  const isDevelopment = nodeEnv === "development";

  return {
    level,
    format: isDevelopment
      ? combine(
          timestamp(),
          errors({ stack: true }),
          nestWinstonUtilities.format.nestLike("backend", {
            colors: true,
            prettyPrint: true,
          }),
          printf(({ context, level: entryLevel, message, timestamp: entryTimestamp, stack }) =>
            `${entryTimestamp} [${entryLevel}]${context ? ` [${context}]` : ""} ${message}${stack ? `\n${stack}` : ""}`,
          ),
        )
      : combine(timestamp(), errors({ stack: true }), json()),
    transports: [new transports.Console()],
  };
}
