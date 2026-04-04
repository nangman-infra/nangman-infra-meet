import { Inject, Injectable } from "@nestjs/common";
import {
  MEETING_REPOSITORY,
  MeetingRepositoryPort,
} from "../ports/meeting-repository.port";
import { AppLogger } from "../../../../common/logging/app-logger.service";
import { MeetingPrimitives } from "../../domain/meeting.entity";
import { MeetingNotFoundError } from "../errors/meeting-not-found.error";
import { assertMeetingHostActor } from "../support/assert-meeting-host-actor";
import { assertMeetingOpen } from "../support/assert-meeting-open";
import { resolveMeetingActorUserId } from "../support/resolve-meeting-actor-user-id";
import { logMeetingActorMismatchIfNeeded } from "../validation/log-meeting-actor-mismatch";

@Injectable()
export class StartMeetingUseCase {
  constructor(
    @Inject(MEETING_REPOSITORY)
    private readonly repository: MeetingRepositoryPort,
    private readonly logger: AppLogger,
  ) {}

  async execute(meetingId: string): Promise<MeetingPrimitives> {
    const actorUserId = resolveMeetingActorUserId();
    const meeting = await this.repository.findById(meetingId);
    if (!meeting) {
      throw new MeetingNotFoundError(meetingId);
    }

    const currentMeeting = meeting.toPrimitives();
    assertMeetingHostActor(currentMeeting, actorUserId);
    assertMeetingOpen(currentMeeting);

    meeting.start(new Date());
    await this.repository.save(meeting);
    const primitives = meeting.toPrimitives();
    logMeetingActorMismatchIfNeeded(this.logger, {
      useCase: "StartMeeting",
      action: "meeting.start",
      meeting: primitives,
    });
    this.logger.info("meeting.started", {
      module: "meetings",
      useCase: "StartMeeting",
      action: "meeting.start",
      result: "success",
      meetingId: primitives.id,
      roomId: primitives.roomId,
      status: primitives.status,
    });

    return primitives;
  }
}
