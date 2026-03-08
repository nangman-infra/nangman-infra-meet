/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import {
  EventStatus,
  EventType,
  MsgType,
  type MatrixEvent,
  type Room as MatrixRoom,
} from "matrix-js-sdk";
import { makeTextMessage } from "matrix-js-sdk/lib/content-helpers";

import {
  MAX_VISIBLE_ROOM_CHAT_MESSAGES,
  type RoomChatMessage,
} from "../domain/RoomChatMessage";

function getMessageIdentifier(event: MatrixEvent, index: number): string {
  return (
    event.getId() ??
    event.getTxnId() ??
    `${event.getSender() ?? "unknown"}:${event.getTs()}:${index}`
  );
}

function getMessageStatus(event: MatrixEvent): RoomChatMessage["status"] {
  const eventStatus = event.status ?? undefined;

  if (eventStatus === EventStatus.NOT_SENT) {
    return "failed";
  }
  if (eventStatus) {
    return "sending";
  }
  return "sent";
}

function readMessageBody(event: MatrixEvent): string | null {
  const content = event.getContent();
  const msgtype = content?.msgtype;
  if (
    msgtype !== MsgType.Text &&
    msgtype !== MsgType.Notice &&
    msgtype !== MsgType.Emote
  ) {
    return null;
  }

  return typeof content?.body === "string" && content.body.trim().length > 0
    ? content.body
    : null;
}

function toRoomChatMessage(
  matrixRoom: MatrixRoom,
  event: MatrixEvent,
  index: number,
): RoomChatMessage | null {
  if (event.getType() !== EventType.RoomMessage || event.isRedacted()) {
    return null;
  }

  const body = readMessageBody(event);
  const senderId = event.getSender();
  if (!body || !senderId) {
    return null;
  }

  const member = matrixRoom.getMember(senderId);

  return {
    id: getMessageIdentifier(event, index),
    senderId,
    senderName: member?.rawDisplayName ?? senderId,
    senderAvatarUrl: member?.getMxcAvatarUrl?.() ?? null,
    body,
    sentAt: event.getTs() ?? 0,
    isOwn: senderId === matrixRoom.client.getUserId(),
    status: getMessageStatus(event),
  };
}

export function readMatrixRoomChatMessages(
  matrixRoom: MatrixRoom,
): RoomChatMessage[] {
  if (typeof matrixRoom.getLiveTimeline !== "function") {
    return [];
  }

  const liveTimeline = matrixRoom.getLiveTimeline();
  if (!liveTimeline || typeof liveTimeline.getEvents !== "function") {
    return [];
  }

  const messages = liveTimeline
    .getEvents()
    .map((event, index) => toRoomChatMessage(matrixRoom, event, index))
    .filter((message): message is RoomChatMessage => message !== null);

  const deduped = new Map<string, RoomChatMessage>();
  for (const message of messages) {
    deduped.set(message.id, message);
  }

  return [...deduped.values()]
    .sort((left, right) => left.sentAt - right.sentAt)
    .slice(-MAX_VISIBLE_ROOM_CHAT_MESSAGES);
}

export async function sendMatrixRoomChatMessage(
  matrixRoom: MatrixRoom,
  body: string,
): Promise<void> {
  await matrixRoom.client.sendMessage(
    matrixRoom.roomId,
    makeTextMessage(body.trim()),
  );
}
