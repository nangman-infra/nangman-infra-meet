/*
Copyright 2025 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type CallMemberSession } from "../../domain/CallMemberSession.ts";
import { type CallSessionStats } from "../../domain/CallSessionStats.ts";

export interface CallSessionViewPort {
  roomId: string;
  getCallMemberSessions: () => CallMemberSession[];
  getCallSessionStats: () => CallSessionStats;
  isJoined: () => boolean;
  subscribeToMembershipsChanged: (
    listener: (
      oldSessions: CallMemberSession[],
      newSessions: CallMemberSession[],
    ) => void,
  ) => () => void;
  subscribeToMembershipManagerError: (
    listener: (error: unknown) => void,
  ) => () => void;
}
