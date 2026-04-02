/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

export type MeetingAttendanceStatus = "present" | "left";

export interface MeetingAttendance {
  readonly id: string;
  readonly meetingId: string;
  readonly userId: string;
  readonly status: MeetingAttendanceStatus;
  readonly joinedAt: string;
  readonly lastSeenAt: string;
  readonly leftAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
