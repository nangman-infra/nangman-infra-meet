import { Controller, Get, Param, Post } from "@nestjs/common";
import { ApproveMeetingAccessRequestUseCase } from "../../application/use-cases/approve-meeting-access-request.use-case";
import { EvaluateMeetingEntryAccessUseCase } from "../../application/use-cases/evaluate-meeting-entry-access.use-case";
import { ListMeetingAccessRequestsUseCase } from "../../application/use-cases/list-meeting-access-requests.use-case";
import { RejectMeetingAccessRequestUseCase } from "../../application/use-cases/reject-meeting-access-request.use-case";
import { RequestMeetingAccessUseCase } from "../../application/use-cases/request-meeting-access.use-case";

@Controller("meetings/:meetingId")
export class ModerationController {
  constructor(
    private readonly evaluateMeetingEntryAccessUseCase: EvaluateMeetingEntryAccessUseCase,
    private readonly requestMeetingAccessUseCase: RequestMeetingAccessUseCase,
    private readonly listMeetingAccessRequestsUseCase: ListMeetingAccessRequestsUseCase,
    private readonly approveMeetingAccessRequestUseCase: ApproveMeetingAccessRequestUseCase,
    private readonly rejectMeetingAccessRequestUseCase: RejectMeetingAccessRequestUseCase,
  ) {}

  @Get("entry-access")
  async getEntryAccess(@Param("meetingId") meetingId: string) {
    return this.evaluateMeetingEntryAccessUseCase.execute(meetingId);
  }

  @Post("access-requests")
  async requestAccess(@Param("meetingId") meetingId: string) {
    return this.requestMeetingAccessUseCase.execute(meetingId);
  }

  @Get("access-requests")
  async listAccessRequests(@Param("meetingId") meetingId: string) {
    return this.listMeetingAccessRequestsUseCase.execute(meetingId);
  }

  @Post("access-requests/:requestId/approve")
  async approveAccessRequest(
    @Param("meetingId") meetingId: string,
    @Param("requestId") requestId: string,
  ) {
    return this.approveMeetingAccessRequestUseCase.execute(meetingId, requestId);
  }

  @Post("access-requests/:requestId/reject")
  async rejectAccessRequest(
    @Param("meetingId") meetingId: string,
    @Param("requestId") requestId: string,
  ) {
    return this.rejectMeetingAccessRequestUseCase.execute(meetingId, requestId);
  }
}
