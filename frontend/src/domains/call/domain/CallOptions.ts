/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

export const callNotificationTypes = ["ring", "notification"] as const;
export type CallNotificationType = (typeof callNotificationTypes)[number];

export const callIntents = ["audio", "video"] as const;
export type CallIntent = (typeof callIntents)[number];
