/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
import { RoomNotePanel } from "./RoomNotePanel";

const originalMatchMedia = window.matchMedia;

describe("RoomNotePanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.matchMedia = originalMatchMedia;
  });

  it("renders the current note and saves updates", async () => {
    const { room, setRoomTopic } = createMatrixRoomEnvironment("Agenda");

    render(<RoomNotePanel matrixRoom={room} open onDismiss={vi.fn()} />);

    expect(screen.getAllByText("Agenda")).toHaveLength(2);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Agenda\n- Introductions\n- Decisions" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));

    await waitFor(() => {
      expect(setRoomTopic).toHaveBeenCalledWith(
        room.roomId,
        "Agenda\n- Introductions\n- Decisions",
      );
    });
  });

  it("shows a read-only view when the user cannot edit the note", () => {
    const { room } = createMatrixRoomEnvironment("Agenda", { canEdit: false });

    render(<RoomNotePanel matrixRoom={room} open onDismiss={vi.fn()} />);

    expect(
      screen.getByText(
        "You can view the shared note, but you do not have permission to update it.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("renders only one visible title in desktop modal presentation", () => {
    const { room } = createMatrixRoomEnvironment("Agenda");

    render(<RoomNotePanel matrixRoom={room} open onDismiss={vi.fn()} />);

    expect(
      screen.getAllByRole("heading", { name: "Shared note" }),
    ).toHaveLength(1);
  });
});

function createMatrixRoomEnvironment(
  initialTopic: string,
  options: { canEdit?: boolean } = {},
): {
  room: MatrixRoom;
  setRoomTopic: ReturnType<typeof vi.fn>;
} {
  const roomState = new EventEmitter();
  let topic = initialTopic;

  const setRoomTopic = vi.fn().mockImplementation(
    async (_roomId: string, nextTopic: string): Promise<void> => {
      await Promise.resolve();
      topic = nextTopic;
      roomState.emit(RoomStateEvent.Events, createRoomTopicEvent(nextTopic));
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

  return { room, setRoomTopic };
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
