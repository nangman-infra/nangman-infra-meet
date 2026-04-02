/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

export interface MeetingAttendanceSummary {
  readonly meetingId: string;
  readonly presentCount: number;
  readonly participantCount: number;
}
