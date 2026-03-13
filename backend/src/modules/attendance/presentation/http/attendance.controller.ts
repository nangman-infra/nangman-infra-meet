import { Controller, Get, Param, Post } from "@nestjs/common";
import { JoinAttendanceUseCase } from "../../application/use-cases/join-attendance.use-case";
import { LeaveAttendanceUseCase } from "../../application/use-cases/leave-attendance.use-case";
import { ListAttendanceUseCase } from "../../application/use-cases/list-attendance.use-case";

@Controller("meetings/:meetingId/attendance")
export class AttendanceController {
  constructor(
    private readonly joinAttendanceUseCase: JoinAttendanceUseCase,
    private readonly leaveAttendanceUseCase: LeaveAttendanceUseCase,
    private readonly listAttendanceUseCase: ListAttendanceUseCase,
  ) {}

  @Get()
  async list(@Param("meetingId") meetingId: string) {
    return this.listAttendanceUseCase.execute(meetingId);
  }

  @Post("join")
  async join(@Param("meetingId") meetingId: string) {
    return this.joinAttendanceUseCase.execute(meetingId);
  }

  @Post("leave")
  async leave(@Param("meetingId") meetingId: string) {
    return this.leaveAttendanceUseCase.execute(meetingId);
  }
}
