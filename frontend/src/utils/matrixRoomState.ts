/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import {
  EventTimeline,
  type MatrixEvent,
  type Room,
  type RoomState,
} from "matrix-js-sdk";

type RoomStateReadable = Pick<Room, "getLiveTimeline"> & Record<string, unknown>;

function getLegacyCurrentRoomState(room: RoomStateReadable): RoomState | null {
  const legacyRoomState = room["currentState"];
  return legacyRoomState && typeof legacyRoomState === "object"
    ? (legacyRoomState as RoomState)
    : null;
}

export function getCurrentRoomState(room: RoomStateReadable): RoomState | null {
  const liveTimeline =
    typeof room.getLiveTimeline === "function" ? room.getLiveTimeline() : null;

  return (
    liveTimeline?.getState(EventTimeline.FORWARDS) ??
    getLegacyCurrentRoomState(room)
  );
}

export function getCurrentStateEvent(
  room: RoomStateReadable,
  eventType: string,
  stateKey = "",
): MatrixEvent | null {
  const currentRoomState = getCurrentRoomState(room);
  const stateWithEvents =
    currentRoomState && typeof currentRoomState.getStateEvents === "function"
      ? currentRoomState
      : getLegacyCurrentRoomState(room);
  const event = stateWithEvents?.getStateEvents(eventType, stateKey);
  return Array.isArray(event) ? null : (event ?? null);
}
