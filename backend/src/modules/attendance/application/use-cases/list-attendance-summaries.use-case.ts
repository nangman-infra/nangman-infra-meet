import { Inject, Injectable } from "@nestjs/common";
import { AppLogger } from "../../../../common/logging/app-logger.service";
import {
  MEETING_REPOSITORY,
  MeetingRepositoryPort,
} from "../../../meetings/application/ports/meeting-repository.port";
import { canViewMeeting } from "../../../meetings/application/support/assert-meeting-visibility";
import { resolveMeetingActorUserId } from "../../../meetings/application/support/resolve-meeting-actor-user-id";
import {
  ATTENDANCE_REPOSITORY,
  AttendanceRepositoryPort,
} from "../ports/attendance-repository.port";
import { AttendanceSummary } from "../read-models/attendance-summary";
import { expireStaleAttendances } from "../support/attendance-freshness";

@Injectable()
export class ListAttendanceSummariesUseCase {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly repository: AttendanceRepositoryPort,
    @Inject(MEETING_REPOSITORY)
    private readonly meetingRepository: MeetingRepositoryPort,
    private readonly logger: AppLogger,
  ) {}

  async execute(meetingIds: string[]): Promise<AttendanceSummary[]> {
    const actorUserId = resolveMeetingActorUserId();
    const uniqueMeetingIds = [...new Set(meetingIds.filter(Boolean))];

    const summaries = await Promise.all(
      uniqueMeetingIds.map(async (meetingId) => {
        const meeting = await this.meetingRepository.findById(meetingId);
        if (!meeting || !canViewMeeting(meeting.toPrimitives(), actorUserId)) {
          return null;
        }

        const attendances = await this.repository.listByMeeting(meetingId);
        await expireStaleAttendances(this.repository, attendances, new Date());
        const participantCount = new Set(
          attendances.map((attendance) => attendance.userId),
        ).size;
        const presentCount = attendances.filter(
          (attendance) => attendance.isPresent,
        ).length;

        return {
          meetingId,
          participantCount,
          presentCount,
        } satisfies AttendanceSummary;
      }),
    );
    const visibleSummaries = summaries.filter(
      (summary): summary is AttendanceSummary => summary !== null,
    );

    this.logger.info("attendance.summaries_listed", {
      module: "attendance",
      useCase: "ListAttendanceSummaries",
      action: "attendance.summary.list",
      result: "success",
      requestedCount: meetingIds.length,
      returnedCount: visibleSummaries.length,
    });

    return visibleSummaries;
  }
}
