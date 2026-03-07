/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import {
  ClientEvent,
  type MatrixClient,
  RoomEvent,
  SyncState,
  type Room,
  type RoomSummary,
} from "matrix-js-sdk";
import { logger } from "matrix-js-sdk/lib/logger";

import type { MatrixRTCSession } from "matrix-js-sdk/lib/matrixrtc";
import type {
  ResolvedRoomAlias,
  RoomLifecyclePort,
  RoomMembershipChangeListener,
} from "../application/ports/RoomLifecyclePort.ts";
import type { RoomCallSessionPort } from "../application/ports/RoomCallSessionPort.ts";
import type { JoinedRoom, RoomSummaryView } from "../domain/RoomTypes.ts";

type RoomClient = Pick<
  MatrixClient,
  | "getRoom"
  | "getRoomIdForAlias"
  | "joinRoom"
  | "knockRoom"
  | "getRoomSummary"
  | "waitUntilRoomReadyForGroupCalls"
  | "getSyncState"
  | "on"
  | "off"
  | "matrixRTC"
>;

export class MatrixRoomLifecycleAdapter implements RoomLifecyclePort {
  private readonly membershipListeners = new Map<
    RoomMembershipChangeListener,
    (room: Room, membership: string, previousMembership?: string) => void
  >();

  public constructor(private readonly client: RoomClient) {}

  private getLeaveReason(room: Room): string | undefined {
    return room.currentState
      .getStateEvents("m.room.member", room.myUserId)
      ?.getContent().reason;
  }

  private mapRoom(room: Room): JoinedRoom {
    return {
      roomId: room.roomId,
      membership: room.getMyMembership(),
      leaveReason: this.getLeaveReason(room),
    };
  }

  private mapRoomSummary(summary: RoomSummary): RoomSummaryView {
    const encryptionSummary = (
      summary as RoomSummary & { "im.nheko.summary.encryption"?: unknown }
    )["im.nheko.summary.encryption"];

    return {
      roomId: summary.room_id,
      name: summary.name,
      avatarUrl: summary.avatar_url ?? null,
      joinRule: summary.join_rule,
      membership: summary.membership,
      isEncrypted: Boolean(encryptionSummary),
    };
  }

  public async waitUntilSyncing(): Promise<void> {
    if (this.client.getSyncState() === SyncState.Syncing) return;

    logger.debug("useLoadGroupCall: waiting for client to start syncing...");

    await new Promise<void>((resolve) => {
      const onSync = (): void => {
        if (this.client.getSyncState() !== SyncState.Syncing) return;

        this.client.off(ClientEvent.Sync, onSync);
        resolve();
      };

      this.client.on(ClientEvent.Sync, onSync);
    });

    logger.debug("useLoadGroupCall: client is now syncing.");
  }

  public getRoom(roomId: string): JoinedRoom | null {
    const room = this.client.getRoom(roomId);
    return room ? this.mapRoom(room) : null;
  }

  public async resolveRoomAlias(alias: string): Promise<ResolvedRoomAlias> {
    const result = await this.client.getRoomIdForAlias(alias);
    return {
      roomId: result.room_id,
      viaServers: result.servers,
    };
  }

  public async joinRoom(
    roomId: string,
    viaServers: string[],
  ): Promise<JoinedRoom> {
    return this.mapRoom(await this.client.joinRoom(roomId, { viaServers }));
  }

  public async knockRoom(roomId: string, viaServers: string[]): Promise<void> {
    await this.client.knockRoom(roomId, { viaServers });
  }

  public async getRoomSummary(
    roomId: string,
    viaServers: string[],
  ): Promise<RoomSummaryView> {
    return this.mapRoomSummary(
      await this.client.getRoomSummary(roomId, viaServers),
    );
  }

  public async waitUntilRoomReadyForGroupCalls(roomId: string): Promise<void> {
    await this.client.waitUntilRoomReadyForGroupCalls(roomId);
  }

  public getRoomSession(roomId: string): RoomCallSessionPort {
    const room = this.client.getRoom(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found while resolving RTC session`);
    }
    return this.client.matrixRTC.getRoomSession(room);
  }

  public onMyMembershipChange(listener: RoomMembershipChangeListener): void {
    const wrappedListener = (
      room: Room,
      membership: string,
      previousMembership?: string,
    ): void => {
      listener({
        roomId: room.roomId,
        membership,
        previousMembership,
        leaveReason: this.getLeaveReason(room),
      });
    };

    this.membershipListeners.set(listener, wrappedListener);
    this.client.on(RoomEvent.MyMembership, wrappedListener);
  }

  public offMyMembershipChange(listener: RoomMembershipChangeListener): void {
    const wrappedListener = this.membershipListeners.get(listener);
    if (!wrappedListener) return;

    this.client.off(RoomEvent.MyMembership, wrappedListener);
    this.membershipListeners.delete(listener);
  }
}

export function toMatrixRoomSession(
  session: RoomCallSessionPort,
): MatrixRTCSession {
  return session as MatrixRTCSession;
}
