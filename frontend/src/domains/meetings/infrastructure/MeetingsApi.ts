/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { logger } from "matrix-js-sdk/lib/logger";

import {
  buildTracedRequestInit,
  resolveResponseTraceContext,
} from "../../../utils/requestTracing";
import { isFailure } from "../../../utils/fetch";
import type { MeetingAccessDecision } from "../domain/MeetingAccessDecision";
import type { MeetingAccessRequest } from "../domain/MeetingAccessRequest";
import type { MeetingAttendance } from "../domain/MeetingAttendance";
import type { Meeting } from "../domain/Meeting";
import type { MeetingAttendanceSummary } from "../domain/MeetingAttendanceSummary";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error: {
    code: number;
    message: string;
  } | null;
}

interface CreateMeetingInput {
  readonly title: string;
  readonly description?: string;
  readonly hostUserId: string;
  readonly allowedUserIds?: string[];
  readonly roomId: string;
  readonly roomAlias?: string;
  readonly joinUrl: string;
  readonly startsAt?: string;
  readonly accessPolicy?: Meeting["accessPolicy"];
  readonly allowJoinBeforeHost?: boolean;
}

interface UpdateMeetingInput {
  readonly title?: string;
  readonly description?: string | null;
  readonly accessPolicy?: Meeting["accessPolicy"];
  readonly allowJoinBeforeHost?: boolean;
  readonly allowedUserIds?: string[];
  readonly startsAt?: string | null;
}

interface RequestActorOptions {
  readonly userId?: string;
}

const MEETINGS_API_BASE = "/api/v1/meetings";
const meetingsApiLogger = logger.getChild("[MeetingsApi]");

export async function listMeetings(
  options: RequestActorOptions = {},
): Promise<Meeting[]> {
  return request<Meeting[]>(MEETINGS_API_BASE, { method: "GET" }, options);
}

export async function createMeeting(
  input: CreateMeetingInput,
  options: RequestActorOptions = {},
): Promise<Meeting> {
  return request<Meeting>(MEETINGS_API_BASE, {
    method: "POST",
    body: JSON.stringify(input),
  }, options);
}

export async function startMeeting(
  meetingId: string,
  options: RequestActorOptions = {},
): Promise<Meeting> {
  return request<Meeting>(`${MEETINGS_API_BASE}/${meetingId}/start`, {
    method: "POST",
  }, options);
}

export async function getMeeting(
  meetingId: string,
  options: RequestActorOptions = {},
): Promise<Meeting> {
  return request<Meeting>(`${MEETINGS_API_BASE}/${meetingId}`, {
    method: "GET",
  }, options);
}

export async function updateMeeting(
  meetingId: string,
  input: UpdateMeetingInput,
  options: RequestActorOptions = {},
): Promise<Meeting> {
  return request<Meeting>(`${MEETINGS_API_BASE}/${meetingId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  }, options);
}

export async function endMeeting(
  meetingId: string,
  options: RequestActorOptions = {},
): Promise<Meeting> {
  return request<Meeting>(`${MEETINGS_API_BASE}/${meetingId}/end`, {
    method: "POST",
  }, options);
}

export async function joinMeetingAttendance(
  meetingId: string,
  options: RequestActorOptions = {},
): Promise<void> {
  await request(
    `${MEETINGS_API_BASE}/${meetingId}/attendance/join`,
    {
      method: "POST",
    },
    options,
  );
}

export async function leaveMeetingAttendance(
  meetingId: string,
  options: RequestActorOptions & { keepalive?: boolean } = {},
): Promise<void> {
  await request(
    `${MEETINGS_API_BASE}/${meetingId}/attendance/leave`,
    {
      method: "POST",
      keepalive: options.keepalive,
    },
    options,
  );
}

export async function listMeetingAttendance(
  meetingId: string,
  options: RequestActorOptions = {},
): Promise<MeetingAttendance[]> {
  return request<MeetingAttendance[]>(
    `${MEETINGS_API_BASE}/${meetingId}/attendance`,
    {
      method: "GET",
    },
    options,
  );
}

export async function getMeetingEntryAccess(
  meetingId: string,
  options: RequestActorOptions = {},
): Promise<MeetingAccessDecision> {
  return request<MeetingAccessDecision>(
    `${MEETINGS_API_BASE}/${meetingId}/entry-access`,
    {
      method: "GET",
    },
    options,
  );
}

export async function requestMeetingAccess(
  meetingId: string,
  options: RequestActorOptions = {},
): Promise<MeetingAccessRequest> {
  return request<MeetingAccessRequest>(
    `${MEETINGS_API_BASE}/${meetingId}/access-requests`,
    {
      method: "POST",
    },
    options,
  );
}

export async function listMeetingAccessRequests(
  meetingId: string,
  options: RequestActorOptions = {},
): Promise<MeetingAccessRequest[]> {
  return request<MeetingAccessRequest[]>(
    `${MEETINGS_API_BASE}/${meetingId}/access-requests`,
    {
      method: "GET",
    },
    options,
  );
}

export async function approveMeetingAccessRequest(
  meetingId: string,
  requestId: string,
  options: RequestActorOptions = {},
): Promise<MeetingAccessRequest> {
  return request<MeetingAccessRequest>(
    `${MEETINGS_API_BASE}/${meetingId}/access-requests/${requestId}/approve`,
    {
      method: "POST",
    },
    options,
  );
}

export async function rejectMeetingAccessRequest(
  meetingId: string,
  requestId: string,
  options: RequestActorOptions = {},
): Promise<MeetingAccessRequest> {
  return request<MeetingAccessRequest>(
    `${MEETINGS_API_BASE}/${meetingId}/access-requests/${requestId}/reject`,
    {
      method: "POST",
    },
    options,
  );
}

export async function listMeetingAttendanceSummaries(
  meetingIds: readonly string[],
  options: RequestActorOptions = {},
): Promise<MeetingAttendanceSummary[]> {
  if (meetingIds.length === 0) {
    return [];
  }

  const params = new URLSearchParams();
  for (const meetingId of meetingIds) {
    params.append("meetingId", meetingId);
  }

  return request<MeetingAttendanceSummary[]>(
    `/api/v1/attendance/summaries?${params.toString()}`,
    {
      method: "GET",
    },
    options,
  );
}

async function request<T>(
  url: string,
  init: RequestInit,
  options: RequestActorOptions,
): Promise<T> {
  const method = init.method ?? "GET";
  const requestInitSource = {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  };
  const { requestInit, traceContext } = buildTracedRequestInit(
    requestInitSource,
    {
      namespace: "meetings_api",
      userId: options.userId,
    },
  );

  meetingsApiLogger.info("meetings_api_request_started", {
    method,
    requestId: traceContext.requestId,
    traceId: traceContext.traceId,
    userId: traceContext.userId,
    url,
  });

  const response = await fetch(url, requestInit);
  const resolvedTraceContext = resolveResponseTraceContext(response, traceContext);

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (isFailure(response) || !payload.success) {
    meetingsApiLogger.error("meetings_api_request_failed", {
      method,
      requestId: resolvedTraceContext.requestId,
      traceId: resolvedTraceContext.traceId,
      userId: resolvedTraceContext.userId,
      url,
      statusCode: response.status,
      errorCode: payload.error?.code ?? response.status,
      errorMessage: payload.error?.message ?? "Request failed",
    });
    throw new Error(payload.error?.message ?? "Request failed");
  }

  meetingsApiLogger.info("meetings_api_request_succeeded", {
    method,
    requestId: resolvedTraceContext.requestId,
    traceId: resolvedTraceContext.traceId,
    userId: resolvedTraceContext.userId,
    url,
    statusCode: response.status,
  });

  return payload.data;
}
