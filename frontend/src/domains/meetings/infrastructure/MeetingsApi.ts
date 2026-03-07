import { isFailure } from "../../../utils/fetch";
import { Meeting } from "../domain/Meeting";

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
  readonly roomId: string;
  readonly roomAlias?: string;
  readonly joinUrl: string;
  readonly startsAt?: string;
  readonly allowJoinBeforeHost?: boolean;
}

const MEETINGS_API_BASE = "/api/v1/meetings";

export async function listMeetings(): Promise<Meeting[]> {
  return request<Meeting[]>(MEETINGS_API_BASE, {
    method: "GET",
  });
}

export async function createMeeting(
  input: CreateMeetingInput,
): Promise<Meeting> {
  return request<Meeting>(MEETINGS_API_BASE, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function startMeeting(meetingId: string): Promise<Meeting> {
  return request<Meeting>(`${MEETINGS_API_BASE}/${meetingId}/start`, {
    method: "POST",
  });
}

async function request<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (isFailure(response) || !payload.success) {
    throw new Error(payload.error?.message ?? "Request failed");
  }

  return payload.data;
}
