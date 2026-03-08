/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

export type RoomChatMessageStatus = "sent" | "sending" | "failed";

export interface RoomChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string | null;
  body: string;
  sentAt: number;
  isOwn: boolean;
  status: RoomChatMessageStatus;
}

export const MAX_VISIBLE_ROOM_CHAT_MESSAGES = 100;
