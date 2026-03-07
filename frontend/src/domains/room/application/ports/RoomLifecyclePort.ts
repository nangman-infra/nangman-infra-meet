/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import type {
  JoinedRoom,
  RoomMembershipChange,
  RoomSummaryView,
} from "../../domain/RoomTypes.ts";
import type { RoomCallSessionPort } from "./RoomCallSessionPort.ts";

export interface ResolvedRoomAlias {
  roomId: string;
  viaServers: string[];
}

export type RoomMembershipChangeListener = (change: RoomMembershipChange) => void;

export interface RoomLifecyclePort {
  waitUntilSyncing(): Promise<void>;
  getRoom(roomId: string): JoinedRoom | null;
  resolveRoomAlias(alias: string): Promise<ResolvedRoomAlias>;
  joinRoom(roomId: string, viaServers: string[]): Promise<JoinedRoom>;
  knockRoom(roomId: string, viaServers: string[]): Promise<void>;
  getRoomSummary(roomId: string, viaServers: string[]): Promise<RoomSummaryView>;
  waitUntilRoomReadyForGroupCalls(roomId: string): Promise<void>;
  getRoomSession(roomId: string): RoomCallSessionPort;
  onMyMembershipChange(listener: RoomMembershipChangeListener): void;
  offMyMembershipChange(listener: RoomMembershipChangeListener): void;
}
