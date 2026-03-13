import { getRequestContext } from "../../../../common/request-context/request-context";
import { AttendanceActorRequiredError } from "../../../attendance/application/errors/attendance-actor-required.error";

export function resolveModerationActorUserId(): string {
  const actorUserId = getRequestContext()?.userId?.trim();
  if (!actorUserId) {
    throw new AttendanceActorRequiredError();
  }

  return actorUserId;
}
