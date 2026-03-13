import { Controller, Get, Query } from "@nestjs/common";
import { ListAttendanceSummariesUseCase } from "../../application/use-cases/list-attendance-summaries.use-case";

@Controller("attendance")
export class AttendanceQueryController {
  constructor(
    private readonly listAttendanceSummariesUseCase: ListAttendanceSummariesUseCase,
  ) {}

  @Get("summaries")
  async listSummaries(
    @Query("meetingId") meetingId: string | string[] | undefined,
  ) {
    const meetingIds = Array.isArray(meetingId)
      ? meetingId
      : meetingId
        ? [meetingId]
        : [];

    return this.listAttendanceSummariesUseCase.execute(meetingIds);
  }
}
