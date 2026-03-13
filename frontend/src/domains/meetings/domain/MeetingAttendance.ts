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
