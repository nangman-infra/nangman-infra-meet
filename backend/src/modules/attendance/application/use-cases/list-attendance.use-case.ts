import { Inject, Injectable } from "@nestjs/common";
import { AppLogger } from "../../../../common/logging/app-logger.service";
import {
  MEETING_REPOSITORY,
  MeetingRepositoryPort,
} from "../../../meetings/application/ports/meeting-repository.port";
import { MeetingNotFoundError } from "../../../meetings/application/errors/meeting-not-found.error";
import { assertMeetingHostActor } from "../../../meetings/application/support/assert-meeting-host-actor";
import { resolveMeetingActorUserId } from "../../../meetings/application/support/resolve-meeting-actor-user-id";
import { AttendancePrimitives } from "../../domain/attendance.entity";
import {
  ATTENDANCE_REPOSITORY,
  AttendanceRepositoryPort,
} from "../ports/attendance-repository.port";
import { expireStaleAttendances } from "../support/attendance-freshness";

@Injectable()
export class ListAttendanceUseCase {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly repository: AttendanceRepositoryPort,
    @Inject(MEETING_REPOSITORY)
    private readonly meetingRepository: MeetingRepositoryPort,
    private readonly logger: AppLogger,
  ) {}

  async execute(meetingId: string): Promise<AttendancePrimitives[]> {
    const actorUserId = resolveMeetingActorUserId();
    const meeting = await this.meetingRepository.findById(meetingId);
    if (!meeting) {
      throw new MeetingNotFoundError(meetingId);
    }

    assertMeetingHostActor(meeting.toPrimitives(), actorUserId);
    const attendances = await this.repository.listByMeeting(meetingId);
    await expireStaleAttendances(this.repository, attendances, new Date());
    const primitives = attendances
      .map((attendance) => attendance.toPrimitives())
      .sort((left, right) => {
        if (left.status !== right.status) {
          return left.status === "present" ? -1 : 1;
        }

        const leftSortKey = left.leftAt ?? left.lastSeenAt;
        const rightSortKey = right.leftAt ?? right.lastSeenAt;
        return rightSortKey.localeCompare(leftSortKey);
      });

    this.logger.info("attendance.listed", {
      module: "attendance",
      useCase: "ListAttendance",
      action: "attendance.list",
      result: "success",
      meetingId,
      count: primitives.length,
    });

    return primitives;
  }
}
