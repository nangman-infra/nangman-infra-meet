export type MeetingStatus = "draft" | "scheduled" | "live" | "ended";
export type MeetingAccessPolicy = "open" | "host_approval" | "invite_only";

export interface Meeting {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly hostUserId: string;
  readonly allowedUserIds: string[];
  readonly roomId: string;
  readonly roomAlias: string | null;
  readonly joinUrl: string;
  readonly accessPolicy: MeetingAccessPolicy;
  readonly allowJoinBeforeHost: boolean;
  readonly status: MeetingStatus;
  readonly startsAt: string | null;
  readonly endsAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
