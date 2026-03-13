import { Meeting } from "../../../meetings/domain/meeting.entity";
import { MeetingModerationForbiddenError } from "../errors/meeting-moderation-forbidden.error";

export function assertMeetingHostActor(
  meeting: Meeting,
  actorUserId: string,
): void {
  if (meeting.hostUserId !== actorUserId) {
    throw new MeetingModerationForbiddenError();
  }
}
