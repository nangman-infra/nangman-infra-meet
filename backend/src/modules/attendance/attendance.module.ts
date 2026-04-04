import { Module } from "@nestjs/common";
import {
  DATABASE,
  DatabaseModule,
  type AppDatabase,
} from "../../database/database.module";
import { MeetingsModule } from "../meetings/meetings.module";
import { ModerationModule } from "../moderation/moderation.module";
import { ATTENDANCE_REPOSITORY } from "./application/ports/attendance-repository.port";
import { JoinAttendanceUseCase } from "./application/use-cases/join-attendance.use-case";
import { LeaveAttendanceUseCase } from "./application/use-cases/leave-attendance.use-case";
import { ListAttendanceUseCase } from "./application/use-cases/list-attendance.use-case";
import { ListAttendanceSummariesUseCase } from "./application/use-cases/list-attendance-summaries.use-case";
import { DrizzleAttendanceRepository } from "./infrastructure/repositories/drizzle-attendance.repository";
import { InMemoryAttendanceRepository } from "./infrastructure/repositories/in-memory-attendance.repository";
import { AttendanceController } from "./presentation/http/attendance.controller";
import { AttendanceQueryController } from "./presentation/http/attendance-query.controller";
import { MeetingLifecycleService } from "./infrastructure/services/meeting-lifecycle.service";

@Module({
  imports: [DatabaseModule, MeetingsModule, ModerationModule],
  controllers: [AttendanceController, AttendanceQueryController],
  providers: [
    JoinAttendanceUseCase,
    LeaveAttendanceUseCase,
    ListAttendanceUseCase,
    ListAttendanceSummariesUseCase,
    MeetingLifecycleService,
    {
      provide: ATTENDANCE_REPOSITORY,
      inject: [DATABASE],
      useFactory: (database: AppDatabase | null) => {
        if (database) {
          return new DrizzleAttendanceRepository(database);
        }

        return new InMemoryAttendanceRepository();
      },
    },
  ],
})
export class AttendanceModule {}
