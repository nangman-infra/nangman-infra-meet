export const MEETING_STATUSES = [
  "draft",
  "scheduled",
  "live",
  "ended",
  "cancelled",
] as const;

export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export function isClosedMeetingStatus(status: MeetingStatus): boolean {
  return status === "ended" || status === "cancelled";
}
