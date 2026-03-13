import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { getRequestContext } from "../request-context/request-context";

type LogFields = Record<string, unknown>;

@Injectable()
export class AppLogger {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  info(event: string, fields: LogFields = {}): void {
    this.logger.info(event, this.enrich(fields));
  }

  warn(event: string, fields: LogFields = {}): void {
    this.logger.warn(event, this.enrich(fields));
  }

  error(event: string, fields: LogFields = {}, error?: unknown): void {
    this.logger.error(event, this.enrich({ ...fields, ...serializeError(error) }));
  }

  private enrich(fields: LogFields): LogFields {
    return {
      ...getRequestContext(),
      ...fields,
    };
  }
}

function serializeError(error: unknown): LogFields {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
    };
  }

  if (error === undefined) {
    return {};
  }

  return {
    error: error,
  };
}
