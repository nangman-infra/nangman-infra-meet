/*
Copyright 2025 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import {
  MatrixRTCSessionEvent,
  type MatrixRTCSession,
  type MatrixRTCSessionEventHandlerMap,
} from "matrix-js-sdk/lib/matrixrtc";

import { type CallSessionViewPort } from "../application/ports/CallSessionViewPort.ts";
import {
  getCallMemberSessions,
  getCallSessionStats,
} from "./MatrixCallSessionAdapter.ts";

export function createMatrixCallSessionViewPort(
  rtcSession: MatrixRTCSession,
): CallSessionViewPort {
  let membershipsSnapshot = rtcSession.memberships;
  let memberSessionsSnapshot = getCallMemberSessions(rtcSession);

  const getCachedCallMemberSessions = (): ReturnType<
    CallSessionViewPort["getCallMemberSessions"]
  > => {
    if (rtcSession.memberships !== membershipsSnapshot) {
      membershipsSnapshot = rtcSession.memberships;
      memberSessionsSnapshot = getCallMemberSessions(rtcSession);
    }
    return memberSessionsSnapshot;
  };

  return {
    roomId: rtcSession.room.roomId,
    getCallMemberSessions: getCachedCallMemberSessions,
    getCallSessionStats: () => getCallSessionStats(rtcSession),
    isJoined: () => rtcSession.isJoined(),
    subscribeToMembershipsChanged: (listener) => {
      const onMembershipsChanged = ((
        oldMemberships,
        newMemberships,
      ): void => {
        membershipsSnapshot = newMemberships;
        memberSessionsSnapshot = getCallMemberSessions({
          memberships: newMemberships,
        });
        listener(
          getCallMemberSessions({ memberships: oldMemberships }),
          memberSessionsSnapshot,
        );
      }) as MatrixRTCSessionEventHandlerMap[MatrixRTCSessionEvent.MembershipsChanged];
      rtcSession.on(
        MatrixRTCSessionEvent.MembershipsChanged,
        onMembershipsChanged,
      );
      return (): void => {
        rtcSession.off(
          MatrixRTCSessionEvent.MembershipsChanged,
          onMembershipsChanged,
        );
      };
    },
    subscribeToMembershipManagerError: (listener) => {
      const onMembershipManagerError = ((error: unknown): void => {
        listener(error);
      }) as MatrixRTCSessionEventHandlerMap[MatrixRTCSessionEvent.MembershipManagerError];
      rtcSession.on(
        MatrixRTCSessionEvent.MembershipManagerError,
        onMembershipManagerError,
      );
      return (): void => {
        rtcSession.off(
          MatrixRTCSessionEvent.MembershipManagerError,
          onMembershipManagerError,
        );
      };
    },
  };
}
