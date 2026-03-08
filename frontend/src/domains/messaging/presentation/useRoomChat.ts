/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { useCallback, useEffect, useState } from "react";
import {
  MatrixEventEvent,
  RoomEvent,
  type MatrixEvent,
  type Room as MatrixRoom,
} from "matrix-js-sdk";

import { type RoomChatMessage } from "../domain/RoomChatMessage";
import {
  readMatrixRoomChatMessages,
  sendMatrixRoomChatMessage,
} from "../infrastructure/MatrixRoomChat";

interface UseRoomChatResult {
  canSend: boolean;
  error: Error | undefined;
  clearError: () => void;
  messages: RoomChatMessage[];
  sendMessage: (body: string) => Promise<void>;
}

export function useRoomChat(matrixRoom: MatrixRoom): UseRoomChatResult {
  const [messages, setMessages] = useState<RoomChatMessage[]>(() =>
    readMatrixRoomChatMessages(matrixRoom),
  );
  const [error, setError] = useState<Error>();

  const refreshMessages = useCallback(() => {
    setMessages(readMatrixRoomChatMessages(matrixRoom));
  }, [matrixRoom]);

  useEffect(() => {
    refreshMessages();
    const matrixClient = matrixRoom.client;
    const canObserveDecryption =
      typeof matrixClient?.on === "function" && typeof matrixClient?.off === "function";

    const onTimelineEvent = (event: MatrixEvent): void => {
      if (event.getRoomId() !== matrixRoom.roomId) return;
      refreshMessages();
    };

    matrixRoom.on(RoomEvent.Timeline, onTimelineEvent);
    matrixRoom.on(RoomEvent.LocalEchoUpdated, onTimelineEvent);
    matrixRoom.on(RoomEvent.Redaction, onTimelineEvent);
    matrixRoom.on(RoomEvent.TimelineReset, refreshMessages);
    if (canObserveDecryption) {
      matrixClient.on(MatrixEventEvent.Decrypted, onTimelineEvent);
    }

    return () => {
      matrixRoom.off(RoomEvent.Timeline, onTimelineEvent);
      matrixRoom.off(RoomEvent.LocalEchoUpdated, onTimelineEvent);
      matrixRoom.off(RoomEvent.Redaction, onTimelineEvent);
      matrixRoom.off(RoomEvent.TimelineReset, refreshMessages);
      if (canObserveDecryption) {
        matrixClient.off(MatrixEventEvent.Decrypted, onTimelineEvent);
      }
    };
  }, [matrixRoom, refreshMessages]);

  const canSend = matrixRoom.maySendMessage();

  const sendMessage = useCallback(
    async (body: string): Promise<void> => {
      const trimmed = body.trim();
      if (!trimmed) return;

      if (!matrixRoom.maySendMessage()) {
        const nextError = new Error(
          "You do not have permission to send messages in this room.",
        );
        setError(nextError);
        throw nextError;
      }

      try {
        setError(undefined);
        await sendMatrixRoomChatMessage(matrixRoom, trimmed);
      } catch (nextError) {
        const normalized =
          nextError instanceof Error
            ? nextError
            : new Error("Failed to send room message.");
        setError(normalized);
        throw normalized;
      }
    },
    [matrixRoom],
  );

  const clearError = useCallback(() => {
    setError(undefined);
  }, []);

  return {
    canSend,
    error,
    clearError,
    messages,
    sendMessage,
  };
}
