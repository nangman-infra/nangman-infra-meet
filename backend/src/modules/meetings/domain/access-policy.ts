export const MEETING_ACCESS_POLICIES = [
  "open",
  "host_approval",
  "invite_only",
] as const;

export type MeetingAccessPolicy = (typeof MEETING_ACCESS_POLICIES)[number];
