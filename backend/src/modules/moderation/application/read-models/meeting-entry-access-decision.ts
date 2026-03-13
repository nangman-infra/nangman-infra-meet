import { MeetingAccessPolicy } from "../../../meetings/domain/access-policy";
import { MeetingStatus } from "../../../meetings/domain/meeting-status";

export type MeetingEntryAccessDecisionKind =
  | "allow"
  | "wait_for_host"
  | "request_access"
  | "pending_approval"
  | "rejected"
  | "not_invited"
  | "meeting_ended";

export interface MeetingEntryAccessDecision {
  readonly kind: MeetingEntryAccessDecisionKind;
  readonly meetingId: string;
  readonly title: string;
  readonly hostUserId: string;
  readonly status: MeetingStatus;
  readonly accessPolicy: MeetingAccessPolicy;
  readonly allowJoinBeforeHost: boolean;
}
