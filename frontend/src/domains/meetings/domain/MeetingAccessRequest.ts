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
