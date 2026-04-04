import { Module } from "@nestjs/common";
import {
  DATABASE,
  DatabaseModule,
  type AppDatabase,
} from "../../database/database.module";
import { MeetingsModule } from "../meetings/meetings.module";
import { MEETING_ACCESS_REQUEST_REPOSITORY } from "./application/ports/meeting-access-request-repository.port";
import { ApproveMeetingAccessRequestUseCase } from "./application/use-cases/approve-meeting-access-request.use-case";
import { EvaluateMeetingEntryAccessUseCase } from "./application/use-cases/evaluate-meeting-entry-access.use-case";
import { ListMeetingAccessRequestsUseCase } from "./application/use-cases/list-meeting-access-requests.use-case";
import { RejectMeetingAccessRequestUseCase } from "./application/use-cases/reject-meeting-access-request.use-case";
import { RequestMeetingAccessUseCase } from "./application/use-cases/request-meeting-access.use-case";
import { DrizzleMeetingAccessRequestRepository } from "./infrastructure/repositories/drizzle-meeting-access-request.repository";
import { InMemoryMeetingAccessRequestRepository } from "./infrastructure/repositories/in-memory-meeting-access-request.repository";
import { ModerationController } from "./presentation/http/moderation.controller";

@Module({
  imports: [DatabaseModule, MeetingsModule],
  controllers: [ModerationController],
  providers: [
    EvaluateMeetingEntryAccessUseCase,
    RequestMeetingAccessUseCase,
    ListMeetingAccessRequestsUseCase,
    ApproveMeetingAccessRequestUseCase,
    RejectMeetingAccessRequestUseCase,
    {
      provide: MEETING_ACCESS_REQUEST_REPOSITORY,
      inject: [DATABASE],
      useFactory: (database: AppDatabase | null) => {
        if (database) {
          return new DrizzleMeetingAccessRequestRepository(database);
        }

        return new InMemoryMeetingAccessRequestRepository();
      },
    },
  ],
  exports: [EvaluateMeetingEntryAccessUseCase, MEETING_ACCESS_REQUEST_REPOSITORY],
})
export class ModerationModule {}
