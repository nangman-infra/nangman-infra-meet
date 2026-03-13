import { Inject, Injectable } from "@nestjs/common";
import { AppLogger } from "../../../../common/logging/app-logger.service";
import {
  MEETING_REPOSITORY,
  MeetingRepositoryPort,
} from "../../../meetings/application/ports/meeting-repository.port";
import { MeetingNotFoundError } from "../../../meetings/application/errors/meeting-not-found.error";
import { MeetingAccessRequestPrimitives } from "../../domain/meeting-access-request.entity";
import {
  MEETING_ACCESS_REQUEST_REPOSITORY,
  MeetingAccessRequestRepositoryPort,
} from "../ports/meeting-access-request-repository.port";
import { assertMeetingHostActor } from "../support/assert-meeting-host-actor";
import { resolveModerationActorUserId } from "../support/resolve-moderation-actor-user-id";

@Injectable()
export class ListMeetingAccessRequestsUseCase {
  constructor(
    @Inject(MEETING_REPOSITORY)
    private readonly meetingRepository: MeetingRepositoryPort,
    @Inject(MEETING_ACCESS_REQUEST_REPOSITORY)
    private readonly accessRequestRepository: MeetingAccessRequestRepositoryPort,
    private readonly logger: AppLogger,
  ) {}

  async execute(meetingId: string): Promise<MeetingAccessRequestPrimitives[]> {
    const actorUserId = resolveModerationActorUserId();
    const meeting = await this.meetingRepository.findById(meetingId);
    if (!meeting) {
      throw new MeetingNotFoundError(meetingId);
    }

    assertMeetingHostActor(meeting, actorUserId);

    const requests = await this.accessRequestRepository.listByMeeting(meetingId);
    const primitives = requests
      .map((request) => request.toPrimitives())
      .sort((left, right) => {
        if (left.status !== right.status) {
          return left.status === "pending" ? -1 : 1;
        }

        return right.updatedAt.localeCompare(left.updatedAt);
      });

    this.logger.info("meeting.access_requests_listed", {
      module: "moderation",
      useCase: "ListMeetingAccessRequests",
      action: "meeting.access_requests.list",
      result: "success",
      meetingId,
      actorUserId,
      count: primitives.length,
    });

    return primitives;
  }
}
