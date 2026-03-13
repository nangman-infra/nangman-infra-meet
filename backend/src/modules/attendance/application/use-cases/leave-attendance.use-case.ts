import { Inject, Injectable } from "@nestjs/common";
import { AppLogger } from "../../../../common/logging/app-logger.service";
import {
  ATTENDANCE_REPOSITORY,
  AttendanceRepositoryPort,
} from "../ports/attendance-repository.port";
import { AttendancePrimitives } from "../../domain/attendance.entity";
import { resolveAttendanceActorUserId } from "../support/resolve-attendance-actor-user-id";
import { ActiveAttendanceNotFoundError } from "../errors/active-attendance-not-found.error";

@Injectable()
export class LeaveAttendanceUseCase {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly repository: AttendanceRepositoryPort,
    private readonly logger: AppLogger,
  ) {}

  async execute(meetingId: string): Promise<AttendancePrimitives> {
    const userId = resolveAttendanceActorUserId();
    const attendance = await this.repository.findActiveByMeetingAndUser(
      meetingId,
      userId,
    );

    if (!attendance) {
      throw new ActiveAttendanceNotFoundError(meetingId, userId);
    }

    attendance.leave(new Date());
    await this.repository.save(attendance);

    const primitives = attendance.toPrimitives();
    this.logger.info("attendance.left", {
      module: "attendance",
      useCase: "LeaveAttendance",
      action: "attendance.leave",
      result: "success",
      attendanceId: primitives.id,
      meetingId: primitives.meetingId,
      actorUserId: primitives.userId,
      status: primitives.status,
    });

    return primitives;
  }
}
