/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { useCallback, useEffect, useState } from "react";
import {
  RoomStateEvent,
  type MatrixEvent,
  type Room as MatrixRoom,
} from "matrix-js-sdk";

import {
  canEditMatrixRoomNote,
  readMatrixRoomNote,
  saveMatrixRoomNote,
} from "../infrastructure/MatrixRoomNote";

interface UseRoomNoteResult {
  canEdit: boolean;
  error: Error | undefined;
  clearError: () => void;
  note: string;
  saveNote: (nextNote: string) => Promise<void>;
}

export function useRoomNote(matrixRoom: MatrixRoom): UseRoomNoteResult {
  const [note, setNote] = useState(() => readMatrixRoomNote(matrixRoom));
  const [error, setError] = useState<Error>();

  const refreshNote = useCallback((): void => {
    setNote(readMatrixRoomNote(matrixRoom));
  }, [matrixRoom]);

  useEffect(() => {
    refreshNote();

    const roomState = matrixRoom.currentState;
    if (
      !roomState ||
      typeof roomState.on !== "function" ||
      typeof roomState.off !== "function"
    ) {
      return;
    }

    const onRoomStateEvent = (event: MatrixEvent): void => {
      if (event.getType() !== "m.room.topic") return;
      if (event.getRoomId() !== matrixRoom.roomId) return;
      refreshNote();
    };

    roomState.on(RoomStateEvent.Events, onRoomStateEvent);
    return (): void => {
      roomState.off(RoomStateEvent.Events, onRoomStateEvent);
    };
  }, [matrixRoom, refreshNote]);

  const saveNote = useCallback(
    async (nextNote: string): Promise<void> => {
      if (!canEditMatrixRoomNote(matrixRoom)) {
        const nextError = new Error(
          "You do not have permission to edit this shared note.",
        );
        setError(nextError);
        throw nextError;
      }

      try {
        setError(undefined);
        await saveMatrixRoomNote(matrixRoom, nextNote);
        refreshNote();
      } catch (nextError) {
        const normalized =
          nextError instanceof Error
            ? nextError
            : new Error("Failed to update the shared note.");
        setError(normalized);
        throw normalized;
      }
    },
    [matrixRoom, refreshNote],
  );

  const clearError = useCallback(() => setError(undefined), []);

  return {
    canEdit: canEditMatrixRoomNote(matrixRoom),
    error,
    clearError,
    note,
    saveNote,
  };
}
