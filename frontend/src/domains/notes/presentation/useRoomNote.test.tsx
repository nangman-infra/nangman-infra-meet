/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { act, renderHook, waitFor } from "@testing-library/react";
import EventEmitter from "events";
import {
  EventType,
  MatrixEvent,
  RoomStateEvent,
  type MatrixClient,
  type Room as MatrixRoom,
} from "matrix-js-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";

import { mockMatrixRoom } from "../../../utils/test";
import { useRoomNote } from "./useRoomNote";

describe("useRoomNote", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads the current room topic and refreshes on topic state changes", async () => {
    const { room, roomState, setTopic } = createMatrixRoomEnvironment("Agenda");
    const { result } = renderHook(() => useRoomNote(room));

    expect(result.current.note).toBe("Agenda");

    setTopic("Updated agenda");
    await act(async () => {
      roomState.emit(
        RoomStateEvent.Events,
        createRoomTopicEvent("Updated agenda"),
      );
    });

    await waitFor(() => {
      expect(result.current.note).toBe("Updated agenda");
    });
  });

  it("saves the shared note through the Matrix client", async () => {
    const { room, setRoomTopic } = createMatrixRoomEnvironment("Agenda");
    const { result } = renderHook(() => useRoomNote(room));

    await act(async () => {
      await result.current.saveNote("Action items");
    });

    expect(setRoomTopic).toHaveBeenCalledWith(
      room.roomId,
      "Action items",
    );
    await waitFor(() => {
      expect(result.current.note).toBe("Action items");
    });
  });

  it("rejects editing when the user cannot update the room topic", async () => {
    const { room } = createMatrixRoomEnvironment("Agenda", { canEdit: false });
    const { result } = renderHook(() => useRoomNote(room));

    await act(async () => {
      await expect(result.current.saveNote("Nope")).rejects.toThrow(
        "You do not have permission to edit this shared note.",
      );
    });
    expect(result.current.canEdit).toBe(false);
  });
});

function createMatrixRoomEnvironment(
  initialTopic: string,
  options: { canEdit?: boolean } = {},
): {
  room: MatrixRoom;
  roomState: EventEmitter;
  setRoomTopic: ReturnType<typeof vi.fn>;
  setTopic: (topic: string) => void;
} {
  const roomState = new EventEmitter();
  let topic = initialTopic;

  const setTopic = (nextTopic: string): void => {
    topic = nextTopic;
  };

  const setRoomTopic = vi.fn().mockImplementation(
    async (_roomId: string, nextTopic: string) => {
      topic = nextTopic;
    },
  );

  const client = {
    setRoomTopic,
  } as unknown as MatrixClient;

  const room = mockMatrixRoom({
    roomId: "!room:example.org",
    client,
    currentState: {
      getStateEvents: () => createRoomTopicEvent(topic),
      mayClientSendStateEvent: () => options.canEdit ?? true,
      on: vi.fn().mockImplementation(
        (eventName: string, listener: (...args: unknown[]) => void) => {
          roomState.on(eventName, listener);
        },
      ),
      off: vi.fn().mockImplementation(
        (eventName: string, listener: (...args: unknown[]) => void) => {
          roomState.off(eventName, listener);
        },
      ),
    } as unknown as MatrixRoom["currentState"],
  });

  return { room, roomState, setRoomTopic, setTopic };
}

function createRoomTopicEvent(topic: string): MatrixEvent {
  return new MatrixEvent({
    room_id: "!room:example.org",
    event_id: "$topic:example.org",
    sender: "@alice:example.org",
    type: EventType.RoomTopic,
    state_key: "",
    content: {
      topic,
    },
  });
}
