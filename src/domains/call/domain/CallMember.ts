/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

export interface CallMember {
  userId: string;
  deviceId: string;
}

export function toCallMember(
  member: Pick<CallMember, "userId" | "deviceId">,
): CallMember {
  return {
    userId: member.userId,
    deviceId: member.deviceId,
  };
}

export function getCallMemberId(member: CallMember): string {
  return `${member.userId}:${member.deviceId}`;
}
