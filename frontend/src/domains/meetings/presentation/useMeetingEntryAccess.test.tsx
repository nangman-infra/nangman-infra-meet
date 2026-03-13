/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as MeetingsApi from "../infrastructure/MeetingsApi";
import { useMeetingEntryAccess } from "./useMeetingEntryAccess";

describe("useMeetingEntryAccess", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("loads the current meeting entry decision", async () => {
    vi.spyOn(MeetingsApi, "getMeetingEntryAccess").mockResolvedValue({
      kind: "wait_for_host",
      meetingId: "meeting-1",
      title: "Weekly sync",
      hostUserId: "@host:matrix.nangman.cloud",
      status: "scheduled",
      accessPolicy: "open",
      allowJoinBeforeHost: false,
    });

    const { result } = renderHook(() =>
      useMeetingEntryAccess({
        meetingId: "meeting-1",
        userId: "@guest:matrix.nangman.cloud",
      }),
    );

    await waitFor(() => {
      expect(result.current.decision?.kind).toBe("wait_for_host");
    });
    expect(result.current.loading).toBe(false);
  });

  it("polls while waiting for approval", async () => {
    vi.useFakeTimers();
    const getDecisionSpy = vi
      .spyOn(MeetingsApi, "getMeetingEntryAccess")
      .mockResolvedValue({
        kind: "pending_approval",
        meetingId: "meeting-1",
        title: "Weekly sync",
        hostUserId: "@host:matrix.nangman.cloud",
        status: "live",
        accessPolicy: "host_approval",
        allowJoinBeforeHost: true,
      });

    renderHook(() =>
      useMeetingEntryAccess({
        meetingId: "meeting-1",
        userId: "@guest:matrix.nangman.cloud",
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(getDecisionSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(5_000);
      await Promise.resolve();
    });
    expect(getDecisionSpy).toHaveBeenCalledTimes(2);
  });

  it("requests access and refreshes the decision", async () => {
    vi.spyOn(MeetingsApi, "getMeetingEntryAccess")
      .mockResolvedValueOnce({
        kind: "request_access",
        meetingId: "meeting-1",
        title: "Weekly sync",
        hostUserId: "@host:matrix.nangman.cloud",
        status: "live",
        accessPolicy: "host_approval",
        allowJoinBeforeHost: true,
      })
      .mockResolvedValueOnce({
        kind: "pending_approval",
        meetingId: "meeting-1",
        title: "Weekly sync",
        hostUserId: "@host:matrix.nangman.cloud",
        status: "live",
        accessPolicy: "host_approval",
        allowJoinBeforeHost: true,
      });
    const requestSpy = vi.spyOn(MeetingsApi, "requestMeetingAccess").mockResolvedValue({
      id: "request-1",
      meetingId: "meeting-1",
      userId: "@guest:matrix.nangman.cloud",
      status: "pending",
      requestedAt: "2026-03-18T01:02:00.000Z",
      respondedAt: null,
      createdAt: "2026-03-18T01:02:00.000Z",
      updatedAt: "2026-03-18T01:02:00.000Z",
    });

    const { result } = renderHook(() =>
      useMeetingEntryAccess({
        meetingId: "meeting-1",
        userId: "@guest:matrix.nangman.cloud",
      }),
    );

    await waitFor(() => {
      expect(result.current.decision?.kind).toBe("request_access");
    });

    await act(async () => {
      await result.current.requestAccess();
    });

    expect(requestSpy).toHaveBeenCalledWith("meeting-1", {
      userId: "@guest:matrix.nangman.cloud",
    });
    await waitFor(() => {
      expect(result.current.decision?.kind).toBe("pending_approval");
    });
  });
});
