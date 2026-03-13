import { Inject, Injectable } from "@nestjs/common";
import { AppLogger } from "../../../../common/logging/app-logger.service";
import {
  ATTENDANCE_REPOSITORY,
  AttendanceRepositoryPort,
} from "../ports/attendance-repository.port";
import { AttendanceSummary } from "../read-models/attendance-summary";

@Injectable()
export class ListAttendanceSummariesUseCase {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly repository: AttendanceRepositoryPort,
    private readonly logger: AppLogger,
  ) {}

  async execute(meetingIds: string[]): Promise<AttendanceSummary[]> {
    const uniqueMeetingIds = [...new Set(meetingIds.filter(Boolean))];

    const summaries = await Promise.all(
      uniqueMeetingIds.map(async (meetingId) => {
        const attendances = await this.repository.listByMeeting(meetingId);
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

    this.logger.info("attendance.summaries_listed", {
      module: "attendance",
      useCase: "ListAttendanceSummaries",
      action: "attendance.summary.list",
      result: "success",
      requestedCount: meetingIds.length,
      returnedCount: summaries.length,
    });

    return summaries;
  }
}
