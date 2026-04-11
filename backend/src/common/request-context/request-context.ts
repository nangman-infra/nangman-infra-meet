import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export const REQUEST_ID_HEADER = "x-request-id";
export const TRACE_ID_HEADER = "x-trace-id";
export const MATRIX_USER_ID_HEADER = "x-matrix-user-id";
export const TEST_RUN_ID_HEADER = "x-test-run-id";

const USER_ID_HEADERS = [
  MATRIX_USER_ID_HEADER,
  "x-actor-id",
  "x-auth-request-user",
  "x-forwarded-user",
  "x-remote-user",
  "remote-user",
  "x-authentik-username",
] as const;

export interface RequestContextValue {
  readonly requestId: string;
  readonly traceId: string;
  readonly userId?: string;
  readonly testRunId?: string;
}

interface RequestHeaderReader {
  header(name: string): string | string[] | undefined;
}

const requestContextStorage = new AsyncLocalStorage<RequestContextValue>();

export function requestContextMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const requestContext = {
    requestId: resolveHeaderValue(request.header(REQUEST_ID_HEADER), "req"),
    traceId: resolveHeaderValue(request.header(TRACE_ID_HEADER), "trace"),
    userId: extractUserIdFromRequest(request),
    testRunId: extractTestRunIdFromRequest(request),
  };

  response.setHeader(REQUEST_ID_HEADER, requestContext.requestId);
  response.setHeader(TRACE_ID_HEADER, requestContext.traceId);

  requestContextStorage.run(requestContext, next);
}

export function getRequestContext(): RequestContextValue | null {
  return requestContextStorage.getStore() ?? null;
}

export async function runWithRequestContext<T>(
  requestContext: RequestContextValue,
  callback: () => Promise<T> | T,
): Promise<T> {
  return await requestContextStorage.run(requestContext, callback);
}

export function extractUserIdFromRequest(
  request: RequestHeaderReader,
): string | undefined {
  for (const headerName of USER_ID_HEADERS) {
    const rawValue = request.header(headerName);
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    const normalizedValue = value?.trim();
    if (normalizedValue) {
      return normalizedValue.slice(0, 255);
    }
  }

  return undefined;
}

export function extractTestRunIdFromRequest(
  request: RequestHeaderReader,
): string | undefined {
  const rawValue = request.header(TEST_RUN_ID_HEADER);
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return undefined;
  }

  return normalizedValue.slice(0, 128);
}

function resolveHeaderValue(
  value: string | undefined,
  prefix: "req" | "trace",
): string {
  const normalizedValue = value?.trim();
  if (normalizedValue) {
    return normalizedValue.slice(0, 128);
  }

  return `${prefix}_${randomUUID()}`;
}
