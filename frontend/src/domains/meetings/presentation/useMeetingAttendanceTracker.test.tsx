/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { render, waitFor } from "@testing-library/react";
import { type FC } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as MeetingsApi from "../infrastructure/MeetingsApi";
import { useMeetingAttendanceTracker } from "./useMeetingAttendanceTracker";

const TestComponent: FC<{
  joined: boolean;
  meetingId: string | null;
  userId?: string;
}> = ({ joined, meetingId, userId }) => {
  useMeetingAttendanceTracker({
    joined,
    meetingId,
    userId,
  });

  return null;
};

describe("useMeetingAttendanceTracker", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("joins attendance when the call becomes active", async () => {
    const joinSpy = vi
      .spyOn(MeetingsApi, "joinMeetingAttendance")
      .mockResolvedValue(undefined);
    const leaveSpy = vi
      .spyOn(MeetingsApi, "leaveMeetingAttendance")
      .mockResolvedValue(undefined);

    const { unmount } = render(
      <TestComponent
        joined
        meetingId="meeting-123"
        userId="@alice:matrix.nangman.cloud"
      />,
    );

    await waitFor(() => {
      expect(joinSpy).toHaveBeenCalledWith("meeting-123", {
        userId: "@alice:matrix.nangman.cloud",
      });
    });

    unmount();

    await waitFor(() => {
      expect(leaveSpy).toHaveBeenCalledWith("meeting-123", {
        userId: "@alice:matrix.nangman.cloud",
        keepalive: true,
      });
    });
  });

  it("leaves attendance when the call ends", async () => {
    vi.spyOn(MeetingsApi, "joinMeetingAttendance").mockResolvedValue(undefined);
    const leaveSpy = vi
      .spyOn(MeetingsApi, "leaveMeetingAttendance")
      .mockResolvedValue(undefined);

    const { rerender } = render(
      <TestComponent
        joined
        meetingId="meeting-123"
        userId="@alice:matrix.nangman.cloud"
      />,
    );

    await waitFor(() => {
      expect(MeetingsApi.joinMeetingAttendance).toHaveBeenCalled();
    });

    rerender(
      <TestComponent
        joined={false}
        meetingId="meeting-123"
        userId="@alice:matrix.nangman.cloud"
      />,
    );

    await waitFor(() => {
      expect(leaveSpy).toHaveBeenCalledWith("meeting-123", {
        userId: "@alice:matrix.nangman.cloud",
        keepalive: false,
      });
    });
  });

  it("queues leave until the pending join completes", async () => {
    let resolveJoin: (() => void) | undefined;
    const joinPromise = new Promise<void>((resolve) => {
      resolveJoin = resolve;
    });
    vi.spyOn(MeetingsApi, "joinMeetingAttendance").mockReturnValue(joinPromise);
    const leaveSpy = vi
      .spyOn(MeetingsApi, "leaveMeetingAttendance")
      .mockResolvedValue(undefined);

    const { rerender } = render(
      <TestComponent
        joined
        meetingId="meeting-123"
        userId="@alice:matrix.nangman.cloud"
      />,
    );

    rerender(
      <TestComponent
        joined={false}
        meetingId="meeting-123"
        userId="@alice:matrix.nangman.cloud"
      />,
    );

    expect(leaveSpy).not.toHaveBeenCalled();

    resolveJoin?.();

    await waitFor(() => {
      expect(leaveSpy).toHaveBeenCalledWith("meeting-123", {
        userId: "@alice:matrix.nangman.cloud",
        keepalive: false,
      });
    });
  });

  it("uses keepalive when the page unmounts during an active meeting", async () => {
    vi.spyOn(MeetingsApi, "joinMeetingAttendance").mockResolvedValue(undefined);
    const leaveSpy = vi
      .spyOn(MeetingsApi, "leaveMeetingAttendance")
      .mockResolvedValue(undefined);

    const { unmount } = render(
      <TestComponent
        joined
        meetingId="meeting-123"
        userId="@alice:matrix.nangman.cloud"
      />,
    );

    await waitFor(() => {
      expect(MeetingsApi.joinMeetingAttendance).toHaveBeenCalled();
    });

    unmount();

    await waitFor(() => {
      expect(leaveSpy).toHaveBeenCalledWith("meeting-123", {
        userId: "@alice:matrix.nangman.cloud",
        keepalive: true,
      });
    });
  });
});
