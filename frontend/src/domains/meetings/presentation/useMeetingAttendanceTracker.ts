/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { useCallback, useEffect, useRef } from "react";
import { logger } from "matrix-js-sdk/lib/logger";

import {
  joinMeetingAttendance,
  leaveMeetingAttendance,
} from "../infrastructure/MeetingsApi";

interface Options {
  readonly joined: boolean;
  readonly meetingId: string | null;
  readonly userId?: string;
}

interface PendingLeave {
  readonly meetingId: string;
  readonly keepalive: boolean;
}

const attendanceLogger = logger.getChild("[MeetingAttendance]");
const ATTENDANCE_REFRESH_INTERVAL_MS = 30_000;

export function useMeetingAttendanceTracker({
  joined,
  meetingId,
  userId,
}: Options): void {
  const activeMeetingIdRef = useRef<string | null>(null);
  const joinInFlightMeetingIdRef = useRef<string | null>(null);
  const pendingLeaveRef = useRef<PendingLeave | null>(null);
  const latestUserIdRef = useRef(userId);

  latestUserIdRef.current = userId;

  const leaveMeeting = useCallback(
    (meetingIdToLeave: string, keepalive: boolean) => {
      const actorUserId = latestUserIdRef.current;
      if (!actorUserId) {
        return;
      }

      activeMeetingIdRef.current = null;
      void leaveMeetingAttendance(meetingIdToLeave, {
        userId: actorUserId,
        keepalive,
      }).catch((error) => {
        attendanceLogger.error("meeting_attendance_leave_failed", {
          meetingId: meetingIdToLeave,
          userId: actorUserId,
          keepalive,
          error:
            error instanceof Error ? error.message : "Unknown leave error",
        });
      });
    },
    [],
  );

  const flushPendingLeave = useCallback(() => {
    const pendingLeave = pendingLeaveRef.current;
    if (!pendingLeave) {
      return;
    }

    pendingLeaveRef.current = null;
    leaveMeeting(pendingLeave.meetingId, pendingLeave.keepalive);
  }, [leaveMeeting]);

  useEffect(() => {
    if (!meetingId || !userId) {
      return;
    }

    if (joined) {
      if (
        activeMeetingIdRef.current === meetingId ||
        joinInFlightMeetingIdRef.current === meetingId
      ) {
        return;
      }

      if (
        activeMeetingIdRef.current &&
        activeMeetingIdRef.current !== meetingId &&
        joinInFlightMeetingIdRef.current !== activeMeetingIdRef.current
      ) {
        pendingLeaveRef.current = {
          meetingId: activeMeetingIdRef.current,
          keepalive: false,
        };
        flushPendingLeave();
      }

      activeMeetingIdRef.current = meetingId;
      joinInFlightMeetingIdRef.current = meetingId;

      void joinMeetingAttendance(meetingId, {
        userId,
      })
        .then(() => {
          if (joinInFlightMeetingIdRef.current === meetingId) {
            joinInFlightMeetingIdRef.current = null;
          }

          if (pendingLeaveRef.current?.meetingId === meetingId) {
            flushPendingLeave();
          }
        })
        .catch((error) => {
          if (joinInFlightMeetingIdRef.current === meetingId) {
            joinInFlightMeetingIdRef.current = null;
          }

          if (activeMeetingIdRef.current === meetingId) {
            activeMeetingIdRef.current = null;
          }

          if (pendingLeaveRef.current?.meetingId === meetingId) {
            pendingLeaveRef.current = null;
          }

          attendanceLogger.error("meeting_attendance_join_failed", {
            meetingId,
            userId,
            error: error instanceof Error ? error.message : "Unknown join error",
          });
        });

      return;
    }

    const activeMeetingId = activeMeetingIdRef.current;
    if (!activeMeetingId) {
      return;
    }

    pendingLeaveRef.current = {
      meetingId: activeMeetingId,
      keepalive: false,
    };

    if (joinInFlightMeetingIdRef.current !== activeMeetingId) {
      flushPendingLeave();
    }
  }, [flushPendingLeave, joined, meetingId, userId]);

  useEffect(() => {
    return (): void => {
      const activeMeetingId = activeMeetingIdRef.current;
      if (!activeMeetingId) {
        return;
      }

      pendingLeaveRef.current = {
        meetingId: activeMeetingId,
        keepalive: true,
      };

      if (joinInFlightMeetingIdRef.current !== activeMeetingId) {
        flushPendingLeave();
      }
    };
  }, [flushPendingLeave]);

  useEffect(() => {
    if (!joined || !meetingId || !userId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (
        activeMeetingIdRef.current !== meetingId ||
        joinInFlightMeetingIdRef.current === meetingId
      ) {
        return;
      }

      void joinMeetingAttendance(meetingId, { userId }).catch((error) => {
        attendanceLogger.error("meeting_attendance_refresh_failed", {
          meetingId,
          userId,
          error:
            error instanceof Error ? error.message : "Unknown refresh error",
        });
      });
    }, ATTENDANCE_REFRESH_INTERVAL_MS);

    return (): void => {
      window.clearInterval(intervalId);
    };
  }, [joined, meetingId, userId]);
}
