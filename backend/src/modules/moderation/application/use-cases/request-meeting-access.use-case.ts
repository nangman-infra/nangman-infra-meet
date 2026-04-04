import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AppLogger } from "../../../../common/logging/app-logger.service";
import {
  MEETING_REPOSITORY,
  MeetingRepositoryPort,
} from "../../../meetings/application/ports/meeting-repository.port";
import { MeetingNotFoundError } from "../../../meetings/application/errors/meeting-not-found.error";
import { assertMeetingOpen } from "../../../meetings/application/support/assert-meeting-open";
import { MeetingAccessRequestUnavailableError } from "../errors/meeting-access-request-unavailable.error";
import { MeetingAccessRequestPrimitives, MeetingAccessRequest } from "../../domain/meeting-access-request.entity";
import {
  MEETING_ACCESS_REQUEST_REPOSITORY,
  MeetingAccessRequestRepositoryPort,
} from "../ports/meeting-access-request-repository.port";
import { resolveModerationActorUserId } from "../support/resolve-moderation-actor-user-id";

@Injectable()
export class RequestMeetingAccessUseCase {
  constructor(
    @Inject(MEETING_REPOSITORY)
    private readonly meetingRepository: MeetingRepositoryPort,
    @Inject(MEETING_ACCESS_REQUEST_REPOSITORY)
    private readonly accessRequestRepository: MeetingAccessRequestRepositoryPort,
    private readonly logger: AppLogger,
  ) {}

  async execute(meetingId: string): Promise<MeetingAccessRequestPrimitives> {
    const actorUserId = resolveModerationActorUserId();
    const meeting = await this.meetingRepository.findById(meetingId);
    if (!meeting) {
      throw new MeetingNotFoundError(meetingId);
    }

    const meetingPrimitives = meeting.toPrimitives();
    assertMeetingOpen(meetingPrimitives);

    if (meetingPrimitives.accessPolicy !== "host_approval") {
      throw new MeetingAccessRequestUnavailableError();
    }

    const existingRequest =
      await this.accessRequestRepository.findLatestByMeetingAndUser(
        meetingId,
        actorUserId,
      );

    if (
      existingRequest &&
      (existingRequest.status === "pending" ||
        existingRequest.status === "approved")
    ) {
      return existingRequest.toPrimitives();
    }

    const nextRequest = MeetingAccessRequest.create({
      id: randomUUID(),
      meetingId,
      userId: actorUserId,
      now: new Date(),
    });
    await this.accessRequestRepository.save(nextRequest);

    const requestPrimitives = nextRequest.toPrimitives();
    this.logger.info("meeting.access_requested", {
      module: "moderation",
      useCase: "RequestMeetingAccess",
      action: "meeting.access.request",
      result: "success",
      meetingId,
      actorUserId,
      accessRequestId: requestPrimitives.id,
    });

    return requestPrimitives;
  }
}
