/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

export type RoomMembershipState =
  | "ban"
  | "invite"
  | "join"
  | "knock"
  | "leave"
  | string
  | undefined;

export type RoomJoinRule = "knock" | "public" | string | undefined;

export interface JoinedRoom {
  roomId: string;
  membership?: RoomMembershipState;
  leaveReason?: string;
}

export interface RoomSummaryView {
  roomId: string;
  name?: string;
  avatarUrl?: string | null;
  joinRule?: RoomJoinRule;
  membership?: RoomMembershipState;
  isEncrypted?: boolean;
}

export interface RoomMembershipChange {
  roomId: string;
  membership: RoomMembershipState;
  previousMembership?: RoomMembershipState;
  leaveReason?: string;
}
