/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { renderHook, waitFor } from "@testing-library/react";
import {
  EventType,
  JoinRule,
  KnownMembership,
  type MatrixClient,
  type Room,
} from "matrix-js-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type MatrixRTCSession } from "matrix-js-sdk/lib/matrixrtc";

import { mockMatrixRoom } from "../utils/test";
import { useGroupCallRooms } from "./useGroupCallRooms";

describe("useGroupCallRooms", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows restricted call rooms when the user belongs to an allowed parent room", async () => {
    const { client } = createClientWithRooms([
      createRoomDefinition({
        roomId: "!space:example.org",
        roomName: "Parent space",
        membership: KnownMembership.Join,
        joinRule: JoinRule.Invite,
        hasCallMembershipState: false,
      }),
      createRoomDefinition({
        roomId: "!restricted-call:example.org",
        roomName: "Restricted call",
        membership: KnownMembership.Leave,
        joinRule: JoinRule.Restricted,
        allowRoomIds: ["!space:example.org"],
      }),
    ]);

    const { result } = renderHook(() => useGroupCallRooms(client));

    await waitFor(() => {
      expect(result.current.map((room) => room.roomName)).toEqual([
        "Restricted call",
      ]);
    });
  });

  it("keeps restricted call rooms hidden when no allow rule is satisfied", async () => {
    const { client } = createClientWithRooms([
      createRoomDefinition({
        roomId: "!space:example.org",
        roomName: "Parent space",
        membership: KnownMembership.Leave,
        joinRule: JoinRule.Invite,
        hasCallMembershipState: false,
      }),
      createRoomDefinition({
        roomId: "!restricted-call:example.org",
        roomName: "Restricted call",
        membership: KnownMembership.Leave,
        joinRule: JoinRule.Restricted,
        allowRoomIds: ["!space:example.org"],
      }),
    ]);

    const { result } = renderHook(() => useGroupCallRooms(client));

    await waitFor(() => {
      expect(result.current).toHaveLength(0);
    });
  });

  it("shows invite-only call rooms when the user has a pending invite", async () => {
    const { client } = createClientWithRooms([
      createRoomDefinition({
        roomId: "!invited-call:example.org",
        roomName: "Invited call",
        membership: KnownMembership.Invite,
        joinRule: JoinRule.Invite,
      }),
    ]);

    const { result } = renderHook(() => useGroupCallRooms(client));

    await waitFor(() => {
      expect(result.current.map((room) => room.roomName)).toEqual([
        "Invited call",
      ]);
    });
  });
});

interface RoomDefinition {
  allowRoomIds?: string[];
  hasCallMembershipState?: boolean;
  joinRule: JoinRule;
  membership: KnownMembership;
  roomId: string;
  roomName: string;
}

function createRoomDefinition(
  definition: RoomDefinition,
): RoomDefinition & { hasCallMembershipState: boolean } {
  return {
    hasCallMembershipState: true,
    ...definition,
  };
}

function createClientWithRooms(definitions: RoomDefinition[]): {
  client: MatrixClient;
} {
  const rooms: Room[] = [];
  const matrixRtcSession = { memberships: [] } as unknown as MatrixRTCSession;

  const client = {
    getUserId: () => "@me:example.org",
    getRoom: (roomId: string | undefined) =>
      rooms.find((room) => room.roomId === roomId) ?? null,
    getRooms: () => rooms,
    matrixRTC: {
      getRoomSession: () => matrixRtcSession,
      on: vi.fn(),
      off: vi.fn(),
    },
    on: vi.fn(),
    off: vi.fn(),
  } as unknown as MatrixClient;

  rooms.push(...definitions.map((definition) => createMockRoom(client, definition)));

  return { client };
}

function createMockRoom(
  client: MatrixClient,
  definition: RoomDefinition,
): Room {
  const {
    allowRoomIds = [],
    hasCallMembershipState = true,
    joinRule,
    membership,
    roomId,
    roomName,
  } = definition;
  const joinRuleContent = {
    join_rule: joinRule,
    allow: allowRoomIds.map((allowedRoomId) => ({
      room_id: allowedRoomId,
      type: "m.room_membership",
    })),
  };

  const room = mockMatrixRoom({
    client,
    roomId,
    name: roomName,
    myUserId: "@me:example.org",
    timeline: [
      {
        getTs: (): number => 1,
      },
    ] as Room["timeline"],
    hasEncryptionStateEvent: () => true,
    getJoinRule: () => joinRule,
    getMyMembership: () => membership,
    getCanonicalAlias: () => null,
    getMxcAvatarUrl: () => "",
    currentState: {
      getStateEvents: (eventType: EventType) => {
        if (eventType !== EventType.RoomJoinRules) {
          return null;
        }

        return {
          getContent: (): typeof joinRuleContent => joinRuleContent,
        };
      },
    } as unknown as Room["currentState"],
    getLiveTimeline: () =>
      ({
        getState: () => ({
          events: new Map(
            hasCallMembershipState
              ? [[EventType.GroupCallMemberPrefix, true]]
              : [],
          ),
        }),
        getEvents: () =>
          hasCallMembershipState
              ? [
                {
                  unstableStickyInfo: {},
                  getType: (): EventType => EventType.GroupCallMemberPrefix,
                },
              ]
            : [],
      }) as unknown as ReturnType<Room["getLiveTimeline"]>,
  });

  Object.defineProperty(room, "_unstable_getStickyEvents", {
    value: (): unknown[] => [],
  });

  return room;
}
