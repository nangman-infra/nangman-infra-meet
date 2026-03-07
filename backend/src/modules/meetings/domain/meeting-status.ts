export const MEETING_STATUSES = [
  "draft",
  "scheduled",
  "live",
  "ended",
] as const;

export type MeetingStatus = (typeof MEETING_STATUSES)[number];
