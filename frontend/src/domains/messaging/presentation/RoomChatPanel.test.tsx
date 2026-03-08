/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import EventEmitter from "events";
import {
  EventType,
  MatrixEvent,
  type MatrixClient,
  type Room as MatrixRoom,
  type RoomMember,
} from "matrix-js-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";

import { mockMatrixRoom } from "../../../utils/test";
import { RoomChatPanel } from "./RoomChatPanel";

describe("RoomChatPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders existing room messages and sends a new one", async () => {
    const { room, sendMessage } = createMatrixRoomEnvironment([
      createTextEvent({
        eventId: "$1:example.org",
        sender: "@alice:example.org",
        body: "Hello team",
        ts: Date.UTC(2026, 2, 8, 8, 0, 0),
      }),
    ]);

    render(
      <RoomChatPanel matrixRoom={room} open onDismiss={vi.fn()} />,
    );

    expect(screen.getByText("Hello team")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Replying now" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith(
        room.roomId,
        expect.objectContaining({
          body: "Replying now",
          msgtype: "m.text",
        }),
      );
    });
  });

  it("shows a read-only state when the user cannot send room messages", () => {
    const { room } = createMatrixRoomEnvironment([], { canSend: false });

    render(
      <RoomChatPanel matrixRoom={room} open onDismiss={vi.fn()} />,
    );

    expect(
      screen.getByText(
        "You can read this room’s messages, but you do not have permission to send new ones.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Message")).not.toBeInTheDocument();
  });
});

function createMatrixRoomEnvironment(
  initialEvents: MatrixEvent[],
  options: { canSend?: boolean } = {},
): {
  room: MatrixRoom;
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
  } as unknown as MatrixClient;

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
    maySendMessage: () => options.canSend ?? true,
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
  });

  return { room, sendMessage };
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
