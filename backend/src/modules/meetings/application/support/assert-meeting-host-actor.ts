import { MeetingPrimitives } from "../../domain/meeting.entity";
import { MeetingHostForbiddenError } from "../errors/meeting-host-forbidden.error";

export function assertMeetingHostActor(
  meeting: Pick<MeetingPrimitives, "hostUserId">,
  actorUserId: string,
): void {
  if (meeting.hostUserId !== actorUserId) {
    throw new MeetingHostForbiddenError();
  }
}
