import { getRequestContext } from "../../../../common/request-context/request-context";
import { MeetingActorRequiredError } from "../errors/meeting-actor-required.error";

export function resolveMeetingActorUserId(): string {
  const actorUserId = getRequestContext()?.userId?.trim();
  if (!actorUserId) {
    throw new MeetingActorRequiredError();
  }

  return actorUserId;
}
