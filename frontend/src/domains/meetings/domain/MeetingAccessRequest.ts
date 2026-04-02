/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

export type MeetingAccessRequestStatus = "pending" | "approved" | "rejected";

export interface MeetingAccessRequest {
  readonly id: string;
  readonly meetingId: string;
  readonly userId: string;
  readonly status: MeetingAccessRequestStatus;
  readonly requestedAt: string;
  readonly respondedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
