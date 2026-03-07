import { Inject, Injectable } from "@nestjs/common";
import {
  MEETING_REPOSITORY,
  MeetingRepositoryPort,
} from "../ports/meeting-repository.port";
import { MeetingPrimitives } from "../../domain/meeting.entity";
import { MeetingNotFoundError } from "../errors/meeting-not-found.error";
import { UpdateMeetingDto } from "../../presentation/http/dto/update-meeting.dto";

@Injectable()
export class UpdateMeetingUseCase {
  constructor(
    @Inject(MEETING_REPOSITORY)
    private readonly repository: MeetingRepositoryPort,
  ) {}

  async execute(
    meetingId: string,
    dto: UpdateMeetingDto,
  ): Promise<MeetingPrimitives> {
    const meeting = await this.repository.findById(meetingId);
    if (!meeting) {
      throw new MeetingNotFoundError(meetingId);
    }

    meeting.update(
      {
        title: dto.title,
        description:
          dto.description === undefined ? undefined : (dto.description ?? null),
        accessPolicy: dto.accessPolicy,
        allowJoinBeforeHost: dto.allowJoinBeforeHost,
        startsAt:
          dto.startsAt === undefined
            ? undefined
            : dto.startsAt
              ? new Date(dto.startsAt)
              : null,
      },
      new Date(),
    );

    await this.repository.save(meeting);

    return meeting.toPrimitives();
  }
}
