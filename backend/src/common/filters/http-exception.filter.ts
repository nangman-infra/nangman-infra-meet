import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  type LoggerService,
} from "@nestjs/common";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import type { Request, Response } from "express";
import { ApplicationError } from "../errors/application-error";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : exception instanceof ApplicationError
          ? exception.statusCode
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;
    const message = extractErrorMessage(exceptionResponse, exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(message, exception instanceof Error ? exception.stack : undefined);
    } else {
      this.logger.warn(
        `${request.method} ${request.originalUrl} -> ${status} ${message}`,
      );
    }

    response.status(status).json({
      success: false,
      data: null,
      error: {
        code: status,
        message,
        path: request.originalUrl,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

function extractErrorMessage(exceptionResponse: unknown, exception: unknown): string {
  if (typeof exceptionResponse === "string") {
    return exceptionResponse;
  }

  if (
    exceptionResponse &&
    typeof exceptionResponse === "object" &&
    "message" in exceptionResponse
  ) {
    const message = (exceptionResponse as { message?: string | string[] }).message;
    if (Array.isArray(message)) {
      return message.join(", ");
    }
    if (typeof message === "string") {
      return message;
    }
  }

  if (exception instanceof Error) {
    return exception.message;
  }

  return "Internal server error";
}
