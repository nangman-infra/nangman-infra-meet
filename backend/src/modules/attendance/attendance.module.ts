import { Module } from "@nestjs/common";
import { MeetingsModule } from "../meetings/meetings.module";
import { ATTENDANCE_REPOSITORY } from "./application/ports/attendance-repository.port";
import { JoinAttendanceUseCase } from "./application/use-cases/join-attendance.use-case";
import { LeaveAttendanceUseCase } from "./application/use-cases/leave-attendance.use-case";
import { ListAttendanceUseCase } from "./application/use-cases/list-attendance.use-case";
import { ListAttendanceSummariesUseCase } from "./application/use-cases/list-attendance-summaries.use-case";
import { InMemoryAttendanceRepository } from "./infrastructure/repositories/in-memory-attendance.repository";
import { AttendanceController } from "./presentation/http/attendance.controller";
import { AttendanceQueryController } from "./presentation/http/attendance-query.controller";

@Module({
  imports: [MeetingsModule],
  controllers: [AttendanceController, AttendanceQueryController],
  providers: [
    JoinAttendanceUseCase,
    LeaveAttendanceUseCase,
    ListAttendanceUseCase,
    ListAttendanceSummariesUseCase,
    InMemoryAttendanceRepository,
    {
      provide: ATTENDANCE_REPOSITORY,
      useExisting: InMemoryAttendanceRepository,
    },
  ],
})
export class AttendanceModule {}
