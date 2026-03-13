import type { WinstonModuleOptions } from "nest-winston";
import { utilities as nestWinstonUtilities } from "nest-winston";
import { format, transports } from "winston";

const { combine, errors, json, printf, timestamp } = format;
const DEFAULT_SERVICE_NAME = "nangman-infra-meet-backend";

export function createWinstonLoggerOptions(
  level: "error" | "warn" | "info" | "debug",
  nodeEnv: "development" | "test" | "production",
): WinstonModuleOptions {
  const isDevelopment = nodeEnv === "development";

  return {
    level,
    defaultMeta: {
      service: DEFAULT_SERVICE_NAME,
      env: nodeEnv,
    },
    format: isDevelopment
      ? combine(
          timestamp(),
          errors({ stack: true }),
          nestWinstonUtilities.format.nestLike("backend", {
            colors: true,
            prettyPrint: true,
          }),
          printf((entry) => {
            const {
              context,
              env,
              level: entryLevel,
              message,
              service,
              stack,
              timestamp: entryTimestamp,
              ...meta
            } = entry;
            const serializedMeta =
              Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";

            return `${entryTimestamp} [${entryLevel}]${context ? ` [${context}]` : ""} ${message} ${JSON.stringify({ env, service })}${serializedMeta}${stack ? `\n${stack}` : ""}`;
          }),
        )
      : combine(timestamp(), errors({ stack: true }), json()),
    transports: [new transports.Console()],
  };
}
