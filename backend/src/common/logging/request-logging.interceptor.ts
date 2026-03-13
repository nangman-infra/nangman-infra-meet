import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { tap, type Observable } from "rxjs";
import { AppLogger } from "./app-logger.service";

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        this.logger.info("http.request.completed", {
          module: "http",
          action: "http.request",
          result: "success",
          method: request.method,
          path: request.originalUrl,
          statusCode: response.statusCode,
          latencyMs: Date.now() - startedAt,
        });
      }),
    );
  }
}
