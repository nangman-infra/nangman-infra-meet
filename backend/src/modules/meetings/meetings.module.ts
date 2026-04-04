import { Module } from "@nestjs/common";
import { DATABASE, DatabaseModule, type AppDatabase } from "../../database/database.module";
import { CreateMeetingUseCase } from "./application/use-cases/create-meeting.use-case";
import { EndMeetingUseCase } from "./application/use-cases/end-meeting.use-case";
import { GetMeetingUseCase } from "./application/use-cases/get-meeting.use-case";
import { ListMeetingsUseCase } from "./application/use-cases/list-meetings.use-case";
import { StartMeetingUseCase } from "./application/use-cases/start-meeting.use-case";
import { UpdateMeetingUseCase } from "./application/use-cases/update-meeting.use-case";
import { MEETING_REPOSITORY, type MeetingRepositoryPort } from "./application/ports/meeting-repository.port";
import { DrizzleMeetingRepository } from "./infrastructure/repositories/drizzle-meeting.repository";
import { InMemoryMeetingRepository } from "./infrastructure/repositories/in-memory-meeting.repository";
import { MeetingsController } from "./presentation/http/meetings.controller";

@Module({
  imports: [DatabaseModule],
  controllers: [MeetingsController],
  providers: [
    CreateMeetingUseCase,
    EndMeetingUseCase,
    GetMeetingUseCase,
    ListMeetingsUseCase,
    StartMeetingUseCase,
    UpdateMeetingUseCase,
    {
      provide: MEETING_REPOSITORY,
      inject: [DATABASE],
      useFactory: (database: AppDatabase | null): MeetingRepositoryPort => {
        if (database) {
          return new DrizzleMeetingRepository(database);
        }

        return new InMemoryMeetingRepository();
      },
    },
  ],
  exports: [MEETING_REPOSITORY],
})
export class MeetingsModule {}
