/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  joinMeetingAttendance,
  leaveMeetingAttendance,
  listMeetingAttendanceSummaries,
  listMeetings,
} from "./MeetingsApi";

describe("MeetingsApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("adds trace headers to meeting API requests", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: [],
            error: null,
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
              "x-request-id": "server_req_123",
              "x-trace-id": "server_trace_123",
            },
          },
        ),
      );

    await expect(listMeetings()).resolves.toEqual([]);

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/v1/meetings",
      expect.objectContaining({
        method: "GET",
        headers: expect.any(Headers),
      }),
    );

    const headers = fetchSpy.mock.calls[0]?.[1]?.headers;
    expect(headers).toBeInstanceOf(Headers);
    expect((headers as Headers).get("content-type")).toBe("application/json");
    expect((headers as Headers).get("x-request-id")).toMatch(
      /^meetings_api_req_/,
    );
    expect((headers as Headers).get("x-trace-id")).toMatch(
      /^meetings_api_trace_/,
    );
  });

  it("forwards the matrix user id when provided", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: [],
            error: null,
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
      );

    await expect(
      listMeetings({
        userId: "@alice:example.org",
      }),
    ).resolves.toEqual([]);

    const headers = fetchSpy.mock.calls[0]?.[1]?.headers;
    expect(headers).toBeInstanceOf(Headers);
    expect((headers as Headers).get("x-matrix-user-id")).toBe(
      "@alice:example.org",
    );
  });

  it("calls attendance join with trace and actor headers", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: null,
            error: null,
          }),
          {
            status: 201,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
      );

    await expect(
      joinMeetingAttendance("meeting-123", {
        userId: "@alice:example.org",
      }),
    ).resolves.toBeUndefined();

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/v1/meetings/meeting-123/attendance/join",
      expect.objectContaining({
        method: "POST",
        headers: expect.any(Headers),
      }),
    );

    const headers = fetchSpy.mock.calls[0]?.[1]?.headers;
    expect((headers as Headers).get("x-request-id")).toMatch(
      /^meetings_api_req_/,
    );
    expect((headers as Headers).get("x-trace-id")).toMatch(
      /^meetings_api_trace_/,
    );
    expect((headers as Headers).get("x-matrix-user-id")).toBe(
      "@alice:example.org",
    );
  });

  it("uses keepalive when leaving attendance on page exit", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: null,
            error: null,
          }),
          {
            status: 201,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
      );

    await expect(
      leaveMeetingAttendance("meeting-123", {
        userId: "@alice:example.org",
        keepalive: true,
      }),
    ).resolves.toBeUndefined();

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/v1/meetings/meeting-123/attendance/leave",
      expect.objectContaining({
        method: "POST",
        keepalive: true,
      }),
    );
  });

  it("requests attendance summaries for multiple meetings", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                meetingId: "meeting-1",
                presentCount: 2,
                participantCount: 3,
              },
            ],
            error: null,
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
      );

    await expect(
      listMeetingAttendanceSummaries(["meeting-1", "meeting-2"], {
        userId: "@alice:example.org",
      }),
    ).resolves.toEqual([
      {
        meetingId: "meeting-1",
        presentCount: 2,
        participantCount: 3,
      },
    ]);

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/v1/attendance/summaries?meetingId=meeting-1&meetingId=meeting-2",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });
});
