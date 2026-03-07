/*
Copyright 2025 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type CallMember } from "./CallMember.ts";

export interface CallMemberSession extends CallMember {
  eventId?: string;
}

export function toCallMemberSession(
  member: Pick<CallMemberSession, "userId" | "deviceId" | "eventId">,
): CallMemberSession {
  return {
    userId: member.userId,
    deviceId: member.deviceId,
    eventId: member.eventId,
  };
}
