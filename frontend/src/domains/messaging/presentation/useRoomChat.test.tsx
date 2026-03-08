/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { act, renderHook, waitFor } from "@testing-library/react";
import EventEmitter from "events";
import {
  EventType,
  MatrixEvent,
  MatrixEventEvent,
  RoomEvent,
  type MatrixClient,
  type Room as MatrixRoom,
  type RoomMember,
} from "matrix-js-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";

import { mockMatrixRoom } from "../../../utils/test";
import { useRoomChat } from "./useRoomChat";

describe("useRoomChat", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads the current room message timeline and refreshes on new messages", async () => {
    const messageEvents = [
      createTextEvent({
        eventId: "$1:example.org",
        sender: "@alice:example.org",
        body: "Hello everyone",
        ts: Date.UTC(2026, 2, 8, 8, 0, 0),
      }),
    ];
    const { room } = createMatrixRoomEnvironment(messageEvents);

    const { result } = renderHook(() => useRoomChat(room));

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]?.body).toBe("Hello everyone");
    expect(result.current.messages[0]?.senderName).toBe("Alice");

    const nextEvent = createTextEvent({
      eventId: "$2:example.org",
      sender: "@me:example.org",
      body: "Welcome!",
      ts: Date.UTC(2026, 2, 8, 8, 1, 0),
    });
    messageEvents.push(nextEvent);
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
      expect(result.current.messages).toHaveLength(2);
    });
    expect(result.current.messages[1]?.body).toBe("Welcome!");
    expect(result.current.messages[1]?.isOwn).toBe(true);
  });

  it("sends messages through the Matrix room client", async () => {
    const { room, sendMessage } = createMatrixRoomEnvironment([]);
    const { result } = renderHook(() => useRoomChat(room));

    await act(async () => {
      await result.current.sendMessage("Team sync in 5 minutes");
    });

    expect(sendMessage).toHaveBeenCalledWith(
      room.roomId,
      expect.objectContaining({
        body: "Team sync in 5 minutes",
        msgtype: "m.text",
      }),
    );
  });

  it("refreshes after decryption events for the same room", async () => {
    const encryptedEvent = createTextEvent({
      eventId: "$3:example.org",
      sender: "@alice:example.org",
      body: "Secret hello",
      ts: Date.UTC(2026, 2, 8, 8, 2, 0),
    });
    encryptedEvent["decryptionPromise"] = Promise.resolve();

    const messageEvents = [encryptedEvent];
    const { room, client } = createMatrixRoomEnvironment(messageEvents);
    const { result } = renderHook(() => useRoomChat(room));

    expect(result.current.messages).toHaveLength(1);

    await act(async () => {
      client.emit(MatrixEventEvent.Decrypted, encryptedEvent);
    });

    await waitFor(() => {
      expect(result.current.messages[0]?.body).toBe("Secret hello");
    });
  });
});

function createMatrixRoomEnvironment(initialEvents: MatrixEvent[]): {
  room: MatrixRoom;
  client: MatrixClient & { emit: (eventName: string, ...args: unknown[]) => boolean };
  sendMessage: ReturnType<typeof vi.fn>;
} {
  const roomEmitter = new EventEmitter();
  const clientEmitter = new EventEmitter();
  const events = initialEvents;
  const sendMessage = vi.fn().mockResolvedValue({ event_id: "$sent:example.org" });

  const client = {
    getUserId: () => "@me:example.org",
    sendMessage,
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
    getLiveTimeline: () => ({
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

  return { room, client, sendMessage };
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
