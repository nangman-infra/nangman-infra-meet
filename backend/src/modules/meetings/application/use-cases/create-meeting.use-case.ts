import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  MEETING_REPOSITORY,
  MeetingRepositoryPort,
} from "../ports/meeting-repository.port";
import { MeetingPrimitives, Meeting } from "../../domain/meeting.entity";
import { CreateMeetingDto } from "../../presentation/http/dto/create-meeting.dto";
import { assertValidScheduledMeetingStart } from "../validation/assert-valid-scheduled-meeting-start";

@Injectable()
export class CreateMeetingUseCase {
  constructor(
    @Inject(MEETING_REPOSITORY)
    private readonly repository: MeetingRepositoryPort,
  ) {}

  async execute(dto: CreateMeetingDto): Promise<MeetingPrimitives> {
    const now = new Date();
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    assertValidScheduledMeetingStart(startsAt, now);

    const meeting = Meeting.create({
      id: randomUUID(),
      title: dto.title,
      description: dto.description ?? null,
      hostUserId: dto.hostUserId,
      roomId: dto.roomId,
      roomAlias: dto.roomAlias ?? null,
      joinUrl: dto.joinUrl,
      accessPolicy: dto.accessPolicy ?? "open",
      allowJoinBeforeHost: dto.allowJoinBeforeHost ?? false,
      startsAt,
      now,
    });

    await this.repository.save(meeting);

    return meeting.toPrimitives();
  }
}
