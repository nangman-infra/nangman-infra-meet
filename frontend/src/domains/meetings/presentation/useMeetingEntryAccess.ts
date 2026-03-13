/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "matrix-js-sdk/lib/logger";

import type { MeetingAccessDecision } from "../domain/MeetingAccessDecision";
import {
  getMeetingEntryAccess,
  requestMeetingAccess,
} from "../infrastructure/MeetingsApi";

interface Options {
  readonly meetingId: string | null;
  readonly userId?: string;
}

interface MeetingEntryAccessState {
  readonly decision: MeetingAccessDecision | null;
  readonly loading: boolean;
  readonly error?: Error;
  readonly requesting: boolean;
  readonly refresh: () => void;
  readonly requestAccess: () => Promise<void>;
}

const POLL_INTERVAL_MS = 5_000;
const meetingEntryLogger = logger.getChild("[MeetingEntryAccess]");

export function useMeetingEntryAccess({
  meetingId,
  userId,
}: Options): MeetingEntryAccessState {
  const [decision, setDecision] = useState<MeetingAccessDecision | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();
  const [requesting, setRequesting] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const requestKeyRef = useRef<string | null>(null);
  const decisionRef = useRef<MeetingAccessDecision | null>(null);

  const refresh = useCallback(() => {
    setRefreshTick((current) => current + 1);
  }, []);

  const requestAccess = useCallback(async (): Promise<void> => {
    if (!meetingId || !userId) {
      return;
    }

    setRequesting(true);
    setError(undefined);

    try {
      await requestMeetingAccess(meetingId, { userId });
      refresh();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError
          : new Error("Failed to request meeting access."),
      );
    } finally {
      setRequesting(false);
    }
  }, [meetingId, refresh, userId]);

  useEffect(() => {
    const requestKey = meetingId && userId ? `${meetingId}:${userId}` : null;
    const keyChanged = requestKeyRef.current !== requestKey;
    requestKeyRef.current = requestKey;

    if (!meetingId || !userId) {
      setDecision(null);
      decisionRef.current = null;
      setError(undefined);
      setLoading(false);
      return;
    }

    if (keyChanged) {
      setDecision(null);
      decisionRef.current = null;
      setError(undefined);
      setLoading(true);
    }

    let cancelled = false;
    const shouldShowLoader = keyChanged || decisionRef.current === null;

    if (shouldShowLoader) {
      setLoading(true);
    }

    void getMeetingEntryAccess(meetingId, { userId })
      .then((nextDecision) => {
        if (cancelled) {
          return;
        }

        setDecision(nextDecision);
        decisionRef.current = nextDecision;
        setError(undefined);
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        const resolvedError =
          nextError instanceof Error
            ? nextError
            : new Error("Failed to load meeting access.");
        meetingEntryLogger.error("meeting_entry_access_load_failed", {
          meetingId,
          userId,
          error: resolvedError.message,
        });
        setError(resolvedError);
      })
      .finally(() => {
        if (cancelled || !shouldShowLoader) {
          return;
        }

        setLoading(false);
      });

    return (): void => {
      cancelled = true;
    };
  }, [meetingId, refreshTick, userId]);

  useEffect(() => {
    if (
      !decision ||
      !meetingId ||
      (decision.kind !== "pending_approval" &&
        decision.kind !== "wait_for_host")
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      refresh();
    }, POLL_INTERVAL_MS);

    return (): void => {
      window.clearInterval(intervalId);
    };
  }, [decision, meetingId, refresh]);

  return {
    decision,
    loading,
    error,
    requesting,
    refresh,
    requestAccess,
  };
}
