import { Inject, Injectable } from "@nestjs/common";
import {
  MEETING_REPOSITORY,
  MeetingRepositoryPort,
} from "../ports/meeting-repository.port";
import { AppLogger } from "../../../../common/logging/app-logger.service";
import { MeetingPrimitives } from "../../domain/meeting.entity";
import { MeetingNotFoundError } from "../errors/meeting-not-found.error";
import { UpdateMeetingDto } from "../../presentation/http/dto/update-meeting.dto";
import { assertMeetingHostActor } from "../support/assert-meeting-host-actor";
import { assertMeetingOpen } from "../support/assert-meeting-open";
import { resolveMeetingActorUserId } from "../support/resolve-meeting-actor-user-id";
import { assertValidScheduledMeetingStart } from "../validation/assert-valid-scheduled-meeting-start";
import { logMeetingActorMismatchIfNeeded } from "../validation/log-meeting-actor-mismatch";

@Injectable()
export class UpdateMeetingUseCase {
  constructor(
    @Inject(MEETING_REPOSITORY)
    private readonly repository: MeetingRepositoryPort,
    private readonly logger: AppLogger,
  ) {}

  async execute(
    meetingId: string,
    dto: UpdateMeetingDto,
  ): Promise<MeetingPrimitives> {
    const actorUserId = resolveMeetingActorUserId();
    const now = new Date();
    const meeting = await this.repository.findById(meetingId);
    if (!meeting) {
      throw new MeetingNotFoundError(meetingId);
    }

    const currentMeeting = meeting.toPrimitives();
    assertMeetingHostActor(currentMeeting, actorUserId);
    assertMeetingOpen(currentMeeting);

    const startsAt =
      dto.startsAt === undefined
        ? undefined
        : dto.startsAt
          ? new Date(dto.startsAt)
          : null;

    assertValidScheduledMeetingStart(startsAt, now);

    meeting.update(
      {
        title: dto.title,
        description:
          dto.description === undefined ? undefined : (dto.description ?? null),
        accessPolicy: dto.accessPolicy,
        allowJoinBeforeHost: dto.allowJoinBeforeHost,
        allowedUserIds: dto.allowedUserIds,
        startsAt,
      },
      now,
    );

    await this.repository.save(meeting);
    const primitives = meeting.toPrimitives();
    logMeetingActorMismatchIfNeeded(this.logger, {
      useCase: "UpdateMeeting",
      action: "meeting.update",
      meeting: primitives,
    });
    this.logger.info("meeting.updated", {
      module: "meetings",
      useCase: "UpdateMeeting",
      action: "meeting.update",
      result: "success",
      meetingId: primitives.id,
      roomId: primitives.roomId,
      status: primitives.status,
    });

    return primitives;
  }
}
