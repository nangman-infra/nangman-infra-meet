/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MatrixEventEvent,
  RoomEvent,
  type MatrixEvent,
  type Room as MatrixRoom,
} from "matrix-js-sdk";

import {
  readMatrixRoomChatMessages,
} from "../infrastructure/MatrixRoomChat";
import { useLocalStorage } from "../../../useLocalStorage";

interface UseRoomChatIndicatorResult {
  unreadCount: number;
}

const ROOM_CHAT_LAST_SEEN_STORAGE_PREFIX = "room-chat:last-seen:";

export function useRoomChatIndicator(
  matrixRoom: MatrixRoom,
  open: boolean,
): UseRoomChatIndicatorResult {
  const storageKey = `${ROOM_CHAT_LAST_SEEN_STORAGE_PREFIX}${matrixRoom.roomId}`;
  const [messages, setMessages] = useState(() =>
    readMatrixRoomChatMessages(matrixRoom),
  );
  const [persistedLastSeenMessageId, setPersistedLastSeenMessageId] =
    useLocalStorage(storageKey);
  const [initialBaselineMessageId] = useState<string | null>(
    () => messages.at(-1)?.id ?? null,
  );

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
    const onTimelineReset = (): void => {
      refreshMessages();
    };

    matrixRoom.on(RoomEvent.Timeline, onTimelineEvent);
    matrixRoom.on(RoomEvent.LocalEchoUpdated, onTimelineEvent);
    matrixRoom.on(RoomEvent.Redaction, onTimelineEvent);
    matrixRoom.on(RoomEvent.TimelineReset, onTimelineReset);
    if (canObserveDecryption) {
      matrixClient.on(MatrixEventEvent.Decrypted, onTimelineEvent);
    }

    return () => {
      matrixRoom.off(RoomEvent.Timeline, onTimelineEvent);
      matrixRoom.off(RoomEvent.LocalEchoUpdated, onTimelineEvent);
      matrixRoom.off(RoomEvent.Redaction, onTimelineEvent);
      matrixRoom.off(RoomEvent.TimelineReset, onTimelineReset);
      if (canObserveDecryption) {
        matrixClient.off(MatrixEventEvent.Decrypted, onTimelineEvent);
      }
    };
  }, [matrixRoom, refreshMessages]);

  useEffect(() => {
    const latestMessageId = messages.at(-1)?.id ?? null;
    if (!latestMessageId) return;

    if (open) {
      if (persistedLastSeenMessageId !== latestMessageId) {
        setPersistedLastSeenMessageId(latestMessageId);
      }
      return;
    }

    if (
      persistedLastSeenMessageId === null &&
      initialBaselineMessageId !== null
    ) {
      setPersistedLastSeenMessageId(initialBaselineMessageId);
    }
  }, [
    initialBaselineMessageId,
    messages,
    open,
    persistedLastSeenMessageId,
    setPersistedLastSeenMessageId,
  ]);

  const unreadCount = useMemo(() => {
    if (open) return 0;
    if (messages.length === 0) return 0;
    const effectiveLastSeenMessageId =
      persistedLastSeenMessageId ?? initialBaselineMessageId;

    const lastSeenIndex = effectiveLastSeenMessageId
      ? messages.findIndex((message) => message.id === effectiveLastSeenMessageId)
      : -1;

    return messages
      .slice(lastSeenIndex + 1)
      .filter((message) => !message.isOwn).length;
  }, [initialBaselineMessageId, messages, open, persistedLastSeenMessageId]);

  return { unreadCount };
}
