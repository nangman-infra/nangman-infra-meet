/*
Copyright 2022-2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { useCallback } from "react";
import {
  type Room,
  RoomEvent,
  RoomStateEvent,
  type RoomState,
} from "matrix-js-sdk";

import { useTypedEventEmitterState } from "../useEvents";
import { getCurrentRoomState } from "../utils/matrixRoomState";

/**
 * A React hook for values computed from room state.
 * @param room The room.
 * @param f A mapping from the current room state to the computed value.
 * @returns The computed value.
 */
export function useRoomState<T>(room: Room, f: (state: RoomState) => T): T {
  const currentState = useTypedEventEmitterState(
    room,
    RoomEvent.CurrentStateUpdated,
    useCallback(() => getCurrentRoomState(room), [room]),
  );
  return useTypedEventEmitterState(
    currentState,
    RoomStateEvent.Update,
    useCallback(() => f(currentState), [f, currentState]),
  );
}
