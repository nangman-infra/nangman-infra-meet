/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

export const REQUEST_ID_HEADER = "x-request-id";
export const TRACE_ID_HEADER = "x-trace-id";
export const MATRIX_USER_ID_HEADER = "x-matrix-user-id";

export interface RequestTraceContext {
  readonly requestId: string;
  readonly traceId: string;
  readonly userId?: string;
}

export interface BuildTracedRequestInitOptions {
  readonly namespace: string;
  readonly userId?: string;
}

let fallbackIdentifierCounter = 0;

export function createRequestTraceContext(
  namespace: string,
  userId?: string,
): RequestTraceContext {
  const identifier = createIdentifier();

  return {
    requestId: `${namespace}_req_${identifier}`,
    traceId: `${namespace}_trace_${identifier}`,
    userId: userId?.trim() || undefined,
  };
}

export function buildTracedRequestInit(
  init: RequestInit,
  options: BuildTracedRequestInitOptions,
): {
  readonly requestInit: RequestInit;
  readonly traceContext: RequestTraceContext;
} {
  const traceContext = createRequestTraceContext(
    options.namespace,
    options.userId,
  );
  const headers = new Headers(init.headers);

  headers.set(REQUEST_ID_HEADER, traceContext.requestId);
  headers.set(TRACE_ID_HEADER, traceContext.traceId);
  if (traceContext.userId) {
    headers.set(MATRIX_USER_ID_HEADER, traceContext.userId);
  }

  return {
    requestInit: {
      ...init,
      headers,
    },
    traceContext,
  };
}

export function resolveResponseTraceContext(
  response: Response,
  fallback: RequestTraceContext,
): RequestTraceContext {
  return {
    requestId: response.headers.get(REQUEST_ID_HEADER) ?? fallback.requestId,
    traceId: response.headers.get(TRACE_ID_HEADER) ?? fallback.traceId,
    userId: fallback.userId,
  };
}

function createIdentifier(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(2);
    globalThis.crypto.getRandomValues(values);

    return `${values[0].toString(16).padStart(8, "0")}${values[1]
      .toString(16)
      .padStart(8, "0")}`;
  }

  fallbackIdentifierCounter = (fallbackIdentifierCounter + 1) >>> 0;
  return `${Date.now().toString(16)}_${fallbackIdentifierCounter
    .toString(16)
    .padStart(8, "0")}`;
}
