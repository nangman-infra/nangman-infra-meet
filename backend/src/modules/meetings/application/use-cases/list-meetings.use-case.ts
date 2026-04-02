import { Inject, Injectable } from "@nestjs/common";
import {
  MEETING_REPOSITORY,
  MeetingRepositoryPort,
} from "../ports/meeting-repository.port";
import { AppLogger } from "../../../../common/logging/app-logger.service";
import { MeetingPrimitives } from "../../domain/meeting.entity";
import { canViewMeeting } from "../support/assert-meeting-visibility";
import { resolveMeetingActorUserId } from "../support/resolve-meeting-actor-user-id";

@Injectable()
export class ListMeetingsUseCase {
  constructor(
    @Inject(MEETING_REPOSITORY)
    private readonly repository: MeetingRepositoryPort,
    private readonly logger: AppLogger,
  ) {}

  async execute(): Promise<MeetingPrimitives[]> {
    const actorUserId = resolveMeetingActorUserId();
    const meetings = await this.repository.list();
    const serializedMeetings = meetings
      .map((meeting) => meeting.toPrimitives())
      .filter((meeting) => canViewMeeting(meeting, actorUserId))
      .sort((left, right) => {
        const leftSortKey = left.startsAt ?? left.createdAt;
        const rightSortKey = right.startsAt ?? right.createdAt;
        return leftSortKey.localeCompare(rightSortKey);
      });

    this.logger.info("meeting.listed", {
      module: "meetings",
      useCase: "ListMeetings",
      action: "meeting.list",
      result: "success",
      count: serializedMeetings.length,
    });

    return serializedMeetings;
  }
}
