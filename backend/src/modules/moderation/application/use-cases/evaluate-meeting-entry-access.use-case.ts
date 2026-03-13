import { Inject, Injectable } from "@nestjs/common";
import { AppLogger } from "../../../../common/logging/app-logger.service";
import {
  MEETING_REPOSITORY,
  MeetingRepositoryPort,
} from "../../../meetings/application/ports/meeting-repository.port";
import { MeetingNotFoundError } from "../../../meetings/application/errors/meeting-not-found.error";
import {
  MEETING_ACCESS_REQUEST_REPOSITORY,
  MeetingAccessRequestRepositoryPort,
} from "../ports/meeting-access-request-repository.port";
import { resolveModerationActorUserId } from "../support/resolve-moderation-actor-user-id";
import { MeetingEntryAccessDecision } from "../read-models/meeting-entry-access-decision";

@Injectable()
export class EvaluateMeetingEntryAccessUseCase {
  constructor(
    @Inject(MEETING_REPOSITORY)
    private readonly meetingRepository: MeetingRepositoryPort,
    @Inject(MEETING_ACCESS_REQUEST_REPOSITORY)
    private readonly accessRequestRepository: MeetingAccessRequestRepositoryPort,
    private readonly logger: AppLogger,
  ) {}

  async execute(meetingId: string): Promise<MeetingEntryAccessDecision> {
    const actorUserId = resolveModerationActorUserId();
    const meeting = await this.meetingRepository.findById(meetingId);
    if (!meeting) {
      throw new MeetingNotFoundError(meetingId);
    }

    const primitives = meeting.toPrimitives();
    const baseDecision = {
      meetingId: primitives.id,
      title: primitives.title,
      hostUserId: primitives.hostUserId,
      status: primitives.status,
      accessPolicy: primitives.accessPolicy,
      allowJoinBeforeHost: primitives.allowJoinBeforeHost,
    } as const;

    const isHost = primitives.hostUserId === actorUserId;
    let kind: MeetingEntryAccessDecision["kind"] = "allow";

    if (primitives.status === "ended") {
      kind = "meeting_ended";
    } else if (!isHost) {
      if (primitives.accessPolicy === "invite_only") {
        kind = primitives.allowedUserIds.includes(actorUserId)
          ? "allow"
          : "not_invited";
      } else if (primitives.accessPolicy === "host_approval") {
        const latestRequest =
          await this.accessRequestRepository.findLatestByMeetingAndUser(
            meetingId,
            actorUserId,
          );

        if (!latestRequest) {
          kind = "request_access";
        } else if (latestRequest.status === "approved") {
          kind = "allow";
        } else if (latestRequest.status === "pending") {
          kind = "pending_approval";
        } else {
          kind = "rejected";
        }
      }

      if (
        kind === "allow" &&
        primitives.status === "scheduled" &&
        !primitives.allowJoinBeforeHost
      ) {
        kind = "wait_for_host";
      }
    }

    this.logger.info("meeting.entry_access_evaluated", {
      module: "moderation",
      useCase: "EvaluateMeetingEntryAccess",
      action: "meeting.entry_access.evaluate",
      result: kind,
      meetingId: primitives.id,
      actorUserId,
      accessPolicy: primitives.accessPolicy,
      meetingStatus: primitives.status,
    });

    return {
      kind,
      ...baseDecision,
    };
  }
}
