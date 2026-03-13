import { getRequestContext } from "../../../../common/request-context/request-context";
import { AttendanceActorRequiredError } from "../errors/attendance-actor-required.error";

export function resolveAttendanceActorUserId(): string {
  const userId = getRequestContext()?.userId;

  if (!userId) {
    throw new AttendanceActorRequiredError();
  }

  return userId;
}
