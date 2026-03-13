import { Module } from "@nestjs/common";
import { MeetingsModule } from "../meetings/meetings.module";
import { MEETING_ACCESS_REQUEST_REPOSITORY } from "./application/ports/meeting-access-request-repository.port";
import { ApproveMeetingAccessRequestUseCase } from "./application/use-cases/approve-meeting-access-request.use-case";
import { EvaluateMeetingEntryAccessUseCase } from "./application/use-cases/evaluate-meeting-entry-access.use-case";
import { ListMeetingAccessRequestsUseCase } from "./application/use-cases/list-meeting-access-requests.use-case";
import { RejectMeetingAccessRequestUseCase } from "./application/use-cases/reject-meeting-access-request.use-case";
import { RequestMeetingAccessUseCase } from "./application/use-cases/request-meeting-access.use-case";
import { InMemoryMeetingAccessRequestRepository } from "./infrastructure/repositories/in-memory-meeting-access-request.repository";
import { ModerationController } from "./presentation/http/moderation.controller";

@Module({
  imports: [MeetingsModule],
  controllers: [ModerationController],
  providers: [
    EvaluateMeetingEntryAccessUseCase,
    RequestMeetingAccessUseCase,
    ListMeetingAccessRequestsUseCase,
    ApproveMeetingAccessRequestUseCase,
    RejectMeetingAccessRequestUseCase,
    InMemoryMeetingAccessRequestRepository,
    {
      provide: MEETING_ACCESS_REQUEST_REPOSITORY,
      useExisting: InMemoryMeetingAccessRequestRepository,
    },
  ],
})
export class ModerationModule {}
