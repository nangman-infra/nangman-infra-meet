import { AppLogger } from "../../../../common/logging/app-logger.service";
import { getRequestContext } from "../../../../common/request-context/request-context";
import { MeetingPrimitives } from "../../domain/meeting.entity";

interface LogMeetingActorMismatchOptions {
  readonly useCase: string;
  readonly action: string;
  readonly meeting: Pick<
    MeetingPrimitives,
    "id" | "hostUserId" | "roomId" | "status"
  >;
}

export function logMeetingActorMismatchIfNeeded(
  logger: AppLogger,
  options: LogMeetingActorMismatchOptions,
): void {
  const requestContext = getRequestContext();

  if (
    !requestContext?.userId ||
    requestContext.userId === options.meeting.hostUserId
  ) {
    return;
  }

  logger.warn("meeting.host_user_mismatch", {
    module: "meetings",
    useCase: options.useCase,
    action: options.action,
    result: "soft_validation_failed",
    actorUserId: requestContext.userId,
    hostUserId: options.meeting.hostUserId,
    meetingId: options.meeting.id,
    roomId: options.meeting.roomId,
    status: options.meeting.status,
  });
}
