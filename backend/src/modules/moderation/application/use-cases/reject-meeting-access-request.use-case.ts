import { Inject, Injectable } from "@nestjs/common";
import { AppLogger } from "../../../../common/logging/app-logger.service";
import {
  MEETING_REPOSITORY,
  MeetingRepositoryPort,
} from "../../../meetings/application/ports/meeting-repository.port";
import { MeetingNotFoundError } from "../../../meetings/application/errors/meeting-not-found.error";
import { assertMeetingOpen } from "../../../meetings/application/support/assert-meeting-open";
import { MeetingAccessRequestPrimitives } from "../../domain/meeting-access-request.entity";
import { MeetingAccessRequestNotFoundError } from "../errors/meeting-access-request-not-found.error";
import {
  MEETING_ACCESS_REQUEST_REPOSITORY,
  MeetingAccessRequestRepositoryPort,
} from "../ports/meeting-access-request-repository.port";
import { assertMeetingHostActor } from "../support/assert-meeting-host-actor";
import { resolveModerationActorUserId } from "../support/resolve-moderation-actor-user-id";

@Injectable()
export class RejectMeetingAccessRequestUseCase {
  constructor(
    @Inject(MEETING_REPOSITORY)
    private readonly meetingRepository: MeetingRepositoryPort,
    @Inject(MEETING_ACCESS_REQUEST_REPOSITORY)
    private readonly accessRequestRepository: MeetingAccessRequestRepositoryPort,
    private readonly logger: AppLogger,
  ) {}

  async execute(
    meetingId: string,
    requestId: string,
  ): Promise<MeetingAccessRequestPrimitives> {
    const actorUserId = resolveModerationActorUserId();
    const meeting = await this.meetingRepository.findById(meetingId);
    if (!meeting) {
      throw new MeetingNotFoundError(meetingId);
    }

    const meetingPrimitives = meeting.toPrimitives();
    assertMeetingHostActor(meeting, actorUserId);
    assertMeetingOpen(meetingPrimitives);

    const request = await this.accessRequestRepository.findById(requestId);
    if (!request || request.meetingId !== meetingId) {
      throw new MeetingAccessRequestNotFoundError(requestId);
    }

    request.reject(new Date());
    await this.accessRequestRepository.save(request);
    const requestPrimitives = request.toPrimitives();

    this.logger.info("meeting.access_request_rejected", {
      module: "moderation",
      useCase: "RejectMeetingAccessRequest",
      action: "meeting.access_request.reject",
      result: "success",
      meetingId,
      actorUserId,
      accessRequestId: requestPrimitives.id,
      targetUserId: requestPrimitives.userId,
    });

    return requestPrimitives;
  }
}
