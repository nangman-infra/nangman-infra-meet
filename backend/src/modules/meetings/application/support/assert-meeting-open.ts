import { MeetingPrimitives } from "../../domain/meeting.entity";
import { isClosedMeetingStatus } from "../../domain/meeting-status";
import { MeetingClosedError } from "../errors/meeting-closed.error";

export function assertMeetingOpen(
  meeting: Pick<MeetingPrimitives, "status">,
): void {
  if (isClosedMeetingStatus(meeting.status)) {
    throw new MeetingClosedError();
  }
}
