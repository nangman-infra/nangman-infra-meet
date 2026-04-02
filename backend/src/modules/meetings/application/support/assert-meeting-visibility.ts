import { MeetingPrimitives } from "../../domain/meeting.entity";
import { MeetingVisibilityForbiddenError } from "../errors/meeting-visibility-forbidden.error";

export function canViewMeeting(
  meeting: Pick<MeetingPrimitives, "accessPolicy" | "allowedUserIds" | "hostUserId">,
  actorUserId: string,
): boolean {
  if (meeting.hostUserId === actorUserId) {
    return true;
  }

  if (meeting.accessPolicy === "invite_only") {
    return meeting.allowedUserIds.includes(actorUserId);
  }

  return true;
}

export function assertCanViewMeeting(
  meeting: Pick<MeetingPrimitives, "accessPolicy" | "allowedUserIds" | "hostUserId">,
  actorUserId: string,
): void {
  if (!canViewMeeting(meeting, actorUserId)) {
    throw new MeetingVisibilityForbiddenError();
  }
}
