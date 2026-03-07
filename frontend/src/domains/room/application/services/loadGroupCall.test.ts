/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import EventEmitter from "events";
import { waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { RoomTerminationError } from "../errors/RoomTerminationError.ts";
import type {
  RoomLifecyclePort,
  RoomMembershipChangeListener,
} from "../ports/RoomLifecyclePort.ts";
import type { RoomCallSessionPort } from "../ports/RoomCallSessionPort.ts";
import type {
  JoinedRoom,
  RoomMembershipState,
  RoomSummaryView,
} from "../../domain/RoomTypes.ts";
import {
  loadGroupCall,
  subscribeToRoomTermination,
  type GroupCallLoadProgress,
} from "./loadGroupCall.ts";

function createRoom(
  roomId: string,
  membership?: RoomMembershipState,
  reason?: string,
): JoinedRoom {
  return {
    roomId,
    membership,
    leaveReason: reason,
  };
}

class FakeRoomLifecyclePort implements RoomLifecyclePort {
  public readonly events = new EventEmitter();
  public readonly waitUntilSyncing = vi.fn().mockResolvedValue(undefined);
  public readonly getRoom = vi.fn();
  public readonly resolveRoomAlias = vi.fn();
  public readonly joinRoom = vi.fn();
  public readonly knockRoom = vi.fn().mockResolvedValue(undefined);
  public readonly getRoomSummary = vi.fn();
  public readonly waitUntilRoomReadyForGroupCalls = vi
    .fn()
    .mockResolvedValue(undefined);
  public readonly getRoomSession = vi.fn();

  public onMyMembershipChange(listener: RoomMembershipChangeListener): void {
    this.events.on("membership", listener);
  }

  public offMyMembershipChange(listener: RoomMembershipChangeListener): void {
    this.events.off("membership", listener);
  }

  public emitMembership(
    room: JoinedRoom,
    membership: RoomMembershipState,
    previousMembership?: RoomMembershipState,
  ): void {
    this.events.emit("membership", {
      roomId: room.roomId,
      membership,
      previousMembership,
      leaveReason: room.leaveReason,
    });
  }
}

describe("loadGroupCall", () => {
  test("joins a public room and returns its RTC session", async () => {
    const roomId = "!room:example.org";
    const room = createRoom(roomId);
    const rtcSession = { room: { roomId } } as RoomCallSessionPort;
    const roomClient = new FakeRoomLifecyclePort();
    roomClient.getRoom.mockReturnValue(null);
    roomClient.getRoomSummary.mockResolvedValue({
      roomId,
      joinRule: "public",
    } satisfies RoomSummaryView);
    roomClient.joinRoom.mockResolvedValue(room);
    roomClient.getRoomSession.mockReturnValue(rtcSession);

    const result = await loadGroupCall({
      roomClient,
      roomIdOrAlias: roomId,
      viaServers: ["example.org"],
      widgetMode: false,
    });

    expect(roomClient.waitUntilSyncing).toHaveBeenCalledOnce();
    expect(roomClient.joinRoom).toHaveBeenCalledWith(roomId, ["example.org"]);
    expect(roomClient.waitUntilRoomReadyForGroupCalls).toHaveBeenCalledWith(
      roomId,
    );
    expect(result).toEqual({ roomId, rtcSession });
  });

  test("supports knock rooms by exposing progress and auto-joining after invite", async () => {
    const roomId = "!room:example.org";
    const room = createRoom(roomId);
    const rtcSession = { room: { roomId } } as RoomCallSessionPort;
    const roomSummary = {
      roomId,
      joinRule: "knock",
      membership: undefined,
    } satisfies RoomSummaryView;
    const roomClient = new FakeRoomLifecyclePort();
    const progressUpdates: GroupCallLoadProgress[] = [];

    roomClient.getRoom.mockReturnValue(null);
    roomClient.getRoomSummary.mockResolvedValue(roomSummary);
    roomClient.joinRoom.mockResolvedValue(room);
    roomClient.getRoomSession.mockReturnValue(rtcSession);

    const loadPromise = loadGroupCall({
      roomClient,
      roomIdOrAlias: roomId,
      viaServers: ["example.org"],
      widgetMode: false,
      onProgress: (progress) => progressUpdates.push(progress),
    });

    await waitFor(() => expect(progressUpdates[0]?.kind).toBe("canKnock"));
    if (progressUpdates[0]?.kind !== "canKnock") {
      throw new Error("Expected canKnock progress update");
    }

    progressUpdates[0].knock();
    await waitFor(() =>
      expect(progressUpdates[1]).toEqual({
        kind: "waitForInvite",
        roomSummary,
      }),
    );

    roomClient.emitMembership(
      room,
      "invite",
      "knock",
    );

    await expect(loadPromise).resolves.toEqual({ roomId, rtcSession });
    expect(roomClient.knockRoom).toHaveBeenCalledWith(roomId, ["example.org"]);
    expect(roomClient.joinRoom).toHaveBeenCalledWith(roomId, ["example.org"]);
  });

  test("reports room termination semantics through the subscription helper", () => {
    const room = createRoom("!room:example.org", "join", "spam");
    const roomClient = new FakeRoomLifecyclePort();
    const onTerminated = vi.fn();

    const unsubscribe = subscribeToRoomTermination({
      roomClient,
      roomId: room.roomId,
      onTerminated,
    });

    roomClient.emitMembership(room, "ban");

    expect(onTerminated).toHaveBeenCalledWith(
      expect.any(RoomTerminationError),
    );
    expect(onTerminated.mock.calls[0][0]).toMatchObject({
      kind: "banned",
      reason: "spam",
    });

    onTerminated.mockClear();
    roomClient.emitMembership(room, "ban");
    expect(onTerminated).not.toHaveBeenCalled();

    unsubscribe();
  });
});
