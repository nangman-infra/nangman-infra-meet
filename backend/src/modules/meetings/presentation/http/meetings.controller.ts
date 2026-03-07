import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { CreateMeetingUseCase } from "../../application/use-cases/create-meeting.use-case";
import { ListMeetingsUseCase } from "../../application/use-cases/list-meetings.use-case";
import { GetMeetingUseCase } from "../../application/use-cases/get-meeting.use-case";
import { UpdateMeetingUseCase } from "../../application/use-cases/update-meeting.use-case";
import { StartMeetingUseCase } from "../../application/use-cases/start-meeting.use-case";
import { EndMeetingUseCase } from "../../application/use-cases/end-meeting.use-case";
import { CreateMeetingDto } from "./dto/create-meeting.dto";
import { UpdateMeetingDto } from "./dto/update-meeting.dto";

@Controller("meetings")
export class MeetingsController {
  constructor(
    private readonly createMeetingUseCase: CreateMeetingUseCase,
    private readonly listMeetingsUseCase: ListMeetingsUseCase,
    private readonly getMeetingUseCase: GetMeetingUseCase,
    private readonly updateMeetingUseCase: UpdateMeetingUseCase,
    private readonly startMeetingUseCase: StartMeetingUseCase,
    private readonly endMeetingUseCase: EndMeetingUseCase,
  ) {}

  @Get()
  async list() {
    return this.listMeetingsUseCase.execute();
  }

  @Post()
  async create(@Body() dto: CreateMeetingDto) {
    return this.createMeetingUseCase.execute(dto);
  }

  @Get(":meetingId")
  async get(@Param("meetingId") meetingId: string) {
    return this.getMeetingUseCase.execute(meetingId);
  }

  @Patch(":meetingId")
  async update(
    @Param("meetingId") meetingId: string,
    @Body() dto: UpdateMeetingDto,
  ) {
    return this.updateMeetingUseCase.execute(meetingId, dto);
  }

  @Post(":meetingId/start")
  async start(@Param("meetingId") meetingId: string) {
    return this.startMeetingUseCase.execute(meetingId);
  }

  @Post(":meetingId/end")
  async end(@Param("meetingId") meetingId: string) {
    return this.endMeetingUseCase.execute(meetingId);
  }
}
