import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  MEETING_REPOSITORY,
  MeetingRepositoryPort,
} from "../ports/meeting-repository.port";
import { AppLogger } from "../../../../common/logging/app-logger.service";
import { MeetingPrimitives, Meeting } from "../../domain/meeting.entity";
import { CreateMeetingDto } from "../../presentation/http/dto/create-meeting.dto";
import { assertValidScheduledMeetingStart } from "../validation/assert-valid-scheduled-meeting-start";
import { logMeetingActorMismatchIfNeeded } from "../validation/log-meeting-actor-mismatch";
import { appendMeetingIdToJoinUrl } from "../support/append-meeting-id-to-join-url";
import { resolveMeetingActorUserId } from "../support/resolve-meeting-actor-user-id";
import { assertMeetingHostActor } from "../support/assert-meeting-host-actor";

@Injectable()
export class CreateMeetingUseCase {
  constructor(
    @Inject(MEETING_REPOSITORY)
    private readonly repository: MeetingRepositoryPort,
    private readonly logger: AppLogger,
  ) {}

  async execute(dto: CreateMeetingDto): Promise<MeetingPrimitives> {
    const actorUserId = resolveMeetingActorUserId();
    const now = new Date();
    const meetingId = randomUUID();
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    assertValidScheduledMeetingStart(startsAt, now);
    assertMeetingHostActor({ hostUserId: dto.hostUserId }, actorUserId);

    const meeting = Meeting.create({
      id: meetingId,
      title: dto.title,
      description: dto.description ?? null,
      hostUserId: dto.hostUserId,
      allowedUserIds: dto.allowedUserIds ?? [],
      roomId: dto.roomId,
      roomAlias: dto.roomAlias ?? null,
      joinUrl: appendMeetingIdToJoinUrl(dto.joinUrl, meetingId),
      accessPolicy: dto.accessPolicy ?? "open",
      allowJoinBeforeHost: dto.allowJoinBeforeHost ?? false,
      startsAt,
      now,
    });

    await this.repository.save(meeting);
    const primitives = meeting.toPrimitives();
    logMeetingActorMismatchIfNeeded(this.logger, {
      useCase: "CreateMeeting",
      action: "meeting.create",
      meeting: primitives,
    });
    this.logger.info("meeting.created", {
      module: "meetings",
      useCase: "CreateMeeting",
      action: "meeting.create",
      result: "success",
      meetingId: primitives.id,
      hostUserId: primitives.hostUserId,
      allowedUserIdsCount: primitives.allowedUserIds.length,
      roomId: primitives.roomId,
      status: primitives.status,
    });

    return primitives;
  }
}
