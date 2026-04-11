/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { EventType, type Room as MatrixRoom } from "matrix-js-sdk";

import {
  getCurrentRoomState,
  getCurrentStateEvent,
} from "../../../utils/matrixRoomState";

export function readMatrixRoomNote(matrixRoom: MatrixRoom): string {
  const noteEvent = getCurrentStateEvent(matrixRoom, EventType.RoomTopic);
  const topic = noteEvent?.getContent()?.topic;

  return typeof topic === "string" ? topic : "";
}

export function canEditMatrixRoomNote(matrixRoom: MatrixRoom): boolean {
  const roomState = getCurrentRoomState(matrixRoom);
  if (
    !roomState ||
    typeof roomState.mayClientSendStateEvent !== "function" ||
    !matrixRoom.client
  ) {
    return false;
  }

  return roomState.mayClientSendStateEvent(EventType.RoomTopic, matrixRoom.client);
}

export async function saveMatrixRoomNote(
  matrixRoom: MatrixRoom,
  note: string,
): Promise<void> {
  await matrixRoom.client.setRoomTopic(matrixRoom.roomId, note.trim() || "");
}
