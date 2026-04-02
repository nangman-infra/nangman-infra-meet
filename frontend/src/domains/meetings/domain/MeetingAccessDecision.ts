/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import type { MeetingAccessPolicy, MeetingStatus } from "./Meeting";

export type MeetingAccessDecisionKind =
  | "allow"
  | "wait_for_host"
  | "request_access"
  | "pending_approval"
  | "rejected"
  | "not_invited"
  | "meeting_ended";

export interface MeetingAccessDecision {
  readonly kind: MeetingAccessDecisionKind;
  readonly meetingId: string;
  readonly title: string;
  readonly hostUserId: string;
  readonly status: MeetingStatus;
  readonly accessPolicy: MeetingAccessPolicy;
  readonly allowJoinBeforeHost: boolean;
}
