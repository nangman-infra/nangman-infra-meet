import { Inject, Injectable } from "@nestjs/common";
import {
  MEETING_REPOSITORY,
  MeetingRepositoryPort,
} from "../ports/meeting-repository.port";
import { AppLogger } from "../../../../common/logging/app-logger.service";
import { MeetingPrimitives } from "../../domain/meeting.entity";
import { MeetingClosedError } from "../errors/meeting-closed.error";
import { MeetingNotFoundError } from "../errors/meeting-not-found.error";
import { assertMeetingHostActor } from "../support/assert-meeting-host-actor";
import { resolveMeetingActorUserId } from "../support/resolve-meeting-actor-user-id";
import { logMeetingActorMismatchIfNeeded } from "../validation/log-meeting-actor-mismatch";

@Injectable()
export class EndMeetingUseCase {
  constructor(
    @Inject(MEETING_REPOSITORY)
    private readonly repository: MeetingRepositoryPort,
    private readonly logger: AppLogger,
  ) {}

  async execute(meetingId: string): Promise<MeetingPrimitives> {
    const actorUserId = resolveMeetingActorUserId();
    const now = new Date();
    const meeting = await this.repository.findById(meetingId);
    if (!meeting) {
      throw new MeetingNotFoundError(meetingId);
    }

    const currentMeeting = meeting.toPrimitives();
    assertMeetingHostActor(currentMeeting, actorUserId);
    if (
      currentMeeting.status === "ended" ||
      currentMeeting.status === "cancelled"
    ) {
      throw new MeetingClosedError();
    }

    if (currentMeeting.status === "scheduled") {
      meeting.cancel(now);
    } else {
      meeting.end(now);
    }
    await this.repository.save(meeting);
    const primitives = meeting.toPrimitives();
    logMeetingActorMismatchIfNeeded(this.logger, {
      useCase: "EndMeeting",
      action: "meeting.end",
      meeting: primitives,
    });
    this.logger.info("meeting.ended", {
      module: "meetings",
      useCase: "EndMeeting",
      action: "meeting.end",
      result: primitives.status === "cancelled" ? "cancelled" : "success",
      meetingId: primitives.id,
      roomId: primitives.roomId,
      status: primitives.status,
    });

    return primitives;
  }
}
