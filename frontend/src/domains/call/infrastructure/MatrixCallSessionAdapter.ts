/*
Copyright 2025 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import {
  type CallMembership,
  type MatrixRTCSession,
} from "matrix-js-sdk/lib/matrixrtc";

import {
  type CallMemberSession,
  toCallMemberSession,
} from "../domain/CallMemberSession.ts";
import { type CallSessionStats } from "../domain/CallSessionStats.ts";

type MatrixCallMembershipLike = Pick<CallMembership, "userId" | "deviceId"> & {
  eventId?: string;
};

export function fromMatrixCallMembership(
  membership: MatrixCallMembershipLike,
): CallMemberSession {
  return toCallMemberSession(membership);
}

export function getCallMemberSessions(
  rtcSession: {
    memberships: MatrixCallMembershipLike[];
  },
): CallMemberSession[] {
  return rtcSession.memberships.map(fromMatrixCallMembership);
}

export function getCallSessionStats(
  rtcSession: {
    statistics: Pick<MatrixRTCSession, "statistics">["statistics"];
  },
): CallSessionStats {
  const received =
    rtcSession.statistics.counters.roomEventEncryptionKeysReceived;

  return {
    roomEventEncryptionKeysSent:
      rtcSession.statistics.counters.roomEventEncryptionKeysSent,
    roomEventEncryptionKeysReceived: received,
    roomEventEncryptionKeysReceivedAverageAge:
      received > 0
        ? rtcSession.statistics.totals.roomEventEncryptionKeysReceivedTotalAge /
          received
        : 0,
  };
}
