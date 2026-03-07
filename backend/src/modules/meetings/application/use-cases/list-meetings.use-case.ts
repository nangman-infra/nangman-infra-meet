import { Inject, Injectable } from "@nestjs/common";
import {
  MEETING_REPOSITORY,
  MeetingRepositoryPort,
} from "../ports/meeting-repository.port";
import { MeetingPrimitives } from "../../domain/meeting.entity";

@Injectable()
export class ListMeetingsUseCase {
  constructor(
    @Inject(MEETING_REPOSITORY)
    private readonly repository: MeetingRepositoryPort,
  ) {}

  async execute(): Promise<MeetingPrimitives[]> {
    const meetings = await this.repository.list();

    return meetings
      .map((meeting) => meeting.toPrimitives())
      .sort((left, right) => {
        const leftSortKey = left.startsAt ?? left.createdAt;
        const rightSortKey = right.startsAt ?? right.createdAt;
        return leftSortKey.localeCompare(rightSortKey);
      });
  }
}
