import { MeetingRepositoryPort } from "../../../meetings/application/ports/meeting-repository.port";
import { MeetingNotFoundError } from "../../../meetings/application/errors/meeting-not-found.error";

export async function assertMeetingExists(
  repository: MeetingRepositoryPort,
  meetingId: string,
): Promise<void> {
  const meeting = await repository.findById(meetingId);
  if (!meeting) {
    throw new MeetingNotFoundError(meetingId);
  }
}
