/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type CallNotificationType } from "./CallOptions.ts";

export interface SentCallNotification {
  eventId?: string;
  notificationType?: CallNotificationType;
  lifetimeMs: number;
}

export interface ReceivedCallDecline {
  relatedEventId?: string;
  sender?: string;
}
