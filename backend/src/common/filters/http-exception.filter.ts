import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AppLogger } from "../logging/app-logger.service";
import { ApplicationError } from "../errors/application-error";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

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

    const logFields = {
      module: "http",
      action: "http.request",
      result: "failure",
      method: request.method,
      path: request.originalUrl,
      statusCode: status,
      errorCode:
        exception instanceof ApplicationError
          ? exception.name
          : exception instanceof HttpException
            ? exception.name
            : "InternalServerError",
      errorMessage: message,
    };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error("http.request.failed", logFields, exception);
    } else {
      this.logger.warn("http.request.failed", logFields);
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
