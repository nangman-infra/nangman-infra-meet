import { Inject, Injectable } from "@nestjs/common";
import {
  MEETING_REPOSITORY,
  MeetingRepositoryPort,
} from "../ports/meeting-repository.port";
import { AppLogger } from "../../../../common/logging/app-logger.service";
import { MeetingPrimitives } from "../../domain/meeting.entity";
import { MeetingNotFoundError } from "../errors/meeting-not-found.error";

@Injectable()
export class GetMeetingUseCase {
  constructor(
    @Inject(MEETING_REPOSITORY)
    private readonly repository: MeetingRepositoryPort,
    private readonly logger: AppLogger,
  ) {}

  async execute(meetingId: string): Promise<MeetingPrimitives> {
    const meeting = await this.repository.findById(meetingId);
    if (!meeting) {
      throw new MeetingNotFoundError(meetingId);
    }

    const primitives = meeting.toPrimitives();
    this.logger.info("meeting.fetched", {
      module: "meetings",
      useCase: "GetMeeting",
      action: "meeting.get",
      result: "success",
      meetingId: primitives.id,
      roomId: primitives.roomId,
      status: primitives.status,
    });

    return primitives;
  }
}
