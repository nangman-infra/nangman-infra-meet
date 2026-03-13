import { MeetingAccessRequest } from "../../domain/meeting-access-request.entity";

export const MEETING_ACCESS_REQUEST_REPOSITORY = Symbol(
  "MEETING_ACCESS_REQUEST_REPOSITORY",
);

export interface MeetingAccessRequestRepositoryPort {
  findById(id: string): Promise<MeetingAccessRequest | null>;
  findLatestByMeetingAndUser(
    meetingId: string,
    userId: string,
  ): Promise<MeetingAccessRequest | null>;
  listByMeeting(meetingId: string): Promise<MeetingAccessRequest[]>;
  save(request: MeetingAccessRequest): Promise<void>;
}
