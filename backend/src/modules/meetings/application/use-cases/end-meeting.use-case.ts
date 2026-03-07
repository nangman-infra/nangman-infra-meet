import { Inject, Injectable } from "@nestjs/common";
import {
  MEETING_REPOSITORY,
  MeetingRepositoryPort,
} from "../ports/meeting-repository.port";
import { MeetingPrimitives } from "../../domain/meeting.entity";
import { MeetingNotFoundError } from "../errors/meeting-not-found.error";

@Injectable()
export class EndMeetingUseCase {
  constructor(
    @Inject(MEETING_REPOSITORY)
    private readonly repository: MeetingRepositoryPort,
  ) {}

  async execute(meetingId: string): Promise<MeetingPrimitives> {
    const meeting = await this.repository.findById(meetingId);
    if (!meeting) {
      throw new MeetingNotFoundError(meetingId);
    }

    meeting.end(new Date());
    await this.repository.save(meeting);

    return meeting.toPrimitives();
  }
}
