/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { act, renderHook, waitFor } from "@testing-library/react";
import EventEmitter from "events";
import {
  EventType,
  MatrixEvent,
  RoomEvent,
  type MatrixClient,
  type Room as MatrixRoom,
  type RoomMember,
} from "matrix-js-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";

import { mockMatrixRoom } from "../../../utils/test";
import { useRoomChatIndicator } from "./useRoomChatIndicator";

describe("useRoomChatIndicator", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("does not mark existing history as unread on first render", () => {
    const { room } = createMatrixRoomEnvironment([
      createTextEvent({
        eventId: "$1:example.org",
        sender: "@alice:example.org",
        body: "Earlier message",
        ts: Date.UTC(2026, 2, 8, 8, 0, 0),
      }),
    ]);

    const { result } = renderHook(() => useRoomChatIndicator(room, false));

    expect(result.current.unreadCount).toBe(0);
  });

  it("increments unread count for new remote messages and clears when opened", async () => {
    const events = [
      createTextEvent({
        eventId: "$1:example.org",
        sender: "@alice:example.org",
        body: "Earlier message",
        ts: Date.UTC(2026, 2, 8, 8, 0, 0),
      }),
    ];
    const { room } = createMatrixRoomEnvironment(events);

    const { result, rerender } = renderHook(
      ({ open }) => useRoomChatIndicator(room, open),
      { initialProps: { open: false } },
    );

    expect(result.current.unreadCount).toBe(0);

    const nextEvent = createTextEvent({
      eventId: "$2:example.org",
      sender: "@alice:example.org",
      body: "New remote message",
      ts: Date.UTC(2026, 2, 8, 8, 1, 0),
    });
    events.push(nextEvent);

    await act(async () => {
      room.emit(
        RoomEvent.Timeline,
        nextEvent,
        room,
        undefined,
        false,
        {
          timeline: room.getLiveTimeline(),
        } as never,
      );
    });

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(1);
    });

    rerender({ open: true });

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(0);
    });
  });

  it("refreshes unread state after timeline reset", async () => {
    const events: MatrixEvent[] = [];
    const { room } = createMatrixRoomEnvironment(events);

    const { result } = renderHook(() => useRoomChatIndicator(room, false));
    expect(result.current.unreadCount).toBe(0);

    events.push(
      createTextEvent({
        eventId: "$3:example.org",
        sender: "@alice:example.org",
        body: "Recovered after sync reset",
        ts: Date.UTC(2026, 2, 8, 8, 2, 0),
      }),
    );

    await act(async () => {
      room.emit(RoomEvent.TimelineReset, room, undefined, true);
    });

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(1);
    });
  });

  it("persists read state across remounts", async () => {
    const events = [
      createTextEvent({
        eventId: "$1:example.org",
        sender: "@alice:example.org",
        body: "Earlier message",
        ts: Date.UTC(2026, 2, 8, 8, 0, 0),
      }),
    ];
    const { room } = createMatrixRoomEnvironment(events);

    const { result, unmount } = renderHook(
      ({ open }) => useRoomChatIndicator(room, open),
      { initialProps: { open: false } },
    );

    const nextEvent = createTextEvent({
      eventId: "$4:example.org",
      sender: "@alice:example.org",
      body: "Unread across remount",
      ts: Date.UTC(2026, 2, 8, 8, 3, 0),
    });
    events.push(nextEvent);

    await act(async () => {
      room.emit(
        RoomEvent.Timeline,
        nextEvent,
        room,
        undefined,
        false,
        {
          timeline: room.getLiveTimeline(),
        } as never,
      );
    });

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(1);
    });

    unmount();

    const remounted = renderHook(() => useRoomChatIndicator(room, false));
    await waitFor(() => {
      expect(remounted.result.current.unreadCount).toBe(1);
    });
  });
});

function createMatrixRoomEnvironment(initialEvents: MatrixEvent[]): {
  room: MatrixRoom & { emit: (eventName: string, ...args: unknown[]) => boolean };
  client: MatrixClient & { emit: (eventName: string, ...args: unknown[]) => boolean };
} {
  const roomEmitter = new EventEmitter();
  const clientEmitter = new EventEmitter();
  const events = initialEvents;

  const client = {
    getUserId: () => "@me:example.org",
    on: vi.fn().mockImplementation((eventName: string, fn: (...args: unknown[]) => void) => {
      clientEmitter.on(eventName, fn);
    }),
    off: vi.fn().mockImplementation((eventName: string, fn: (...args: unknown[]) => void) => {
      clientEmitter.off(eventName, fn);
    }),
    emit: (eventName: string, ...args: unknown[]) => clientEmitter.emit(eventName, ...args),
  } as unknown as MatrixClient & {
    emit: (eventName: string, ...args: unknown[]) => boolean;
  };

  const members = new Map<string, RoomMember>([
    [
      "@alice:example.org",
      {
        userId: "@alice:example.org",
        rawDisplayName: "Alice",
        getMxcAvatarUrl: () => undefined,
      } as RoomMember,
    ],
    [
      "@me:example.org",
      {
        userId: "@me:example.org",
        rawDisplayName: "Me",
        getMxcAvatarUrl: () => undefined,
      } as RoomMember,
    ],
  ]);

  const room = mockMatrixRoom({
    roomId: "!room:example.org",
    client,
    maySendMessage: () => true,
    getMember: (userId: string) => members.get(userId) ?? null,
    getLiveTimeline: () =>
      ({
        getEvents: () => events,
      }) as ReturnType<MatrixRoom["getLiveTimeline"]>,
    on: vi.fn().mockImplementation((eventName: string, fn: (...args: unknown[]) => void) => {
      roomEmitter.on(eventName, fn);
    }),
    off: vi.fn().mockImplementation((eventName: string, fn: (...args: unknown[]) => void) => {
      roomEmitter.off(eventName, fn);
    }),
    emit: (eventName: string, ...args: unknown[]) => roomEmitter.emit(eventName, ...args),
  });

  return { room, client };
}

function createTextEvent({
  eventId,
  sender,
  body,
  ts,
}: {
  eventId: string;
  sender: string;
  body: string;
  ts: number;
}): MatrixEvent {
  return new MatrixEvent({
    room_id: "!room:example.org",
    event_id: eventId,
    sender,
    type: EventType.RoomMessage,
    origin_server_ts: ts,
    content: {
      msgtype: "m.text",
      body,
    },
  });
}
