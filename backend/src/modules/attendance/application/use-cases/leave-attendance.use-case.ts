import { Inject, Injectable } from "@nestjs/common";
import { AppLogger } from "../../../../common/logging/app-logger.service";
import {
  MEETING_REPOSITORY,
  MeetingRepositoryPort,
} from "../../../meetings/application/ports/meeting-repository.port";
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
    @Inject(MEETING_REPOSITORY)
    private readonly meetingRepository: MeetingRepositoryPort,
    private readonly logger: AppLogger,
  ) {}

  async execute(meetingId: string): Promise<AttendancePrimitives> {
    const userId = resolveAttendanceActorUserId();
    const now = new Date();
    const attendance = await this.repository.findActiveByMeetingAndUser(
      meetingId,
      userId,
    );

    if (!attendance) {
      throw new ActiveAttendanceNotFoundError(meetingId, userId);
    }

    attendance.leave(now);
    await this.repository.save(attendance);

    const meeting = await this.meetingRepository.findById(meetingId);
    const meetingPrimitives = meeting?.toPrimitives();
    const shouldEndMeeting =
      meeting &&
      meetingPrimitives?.status === "live" &&
      meetingPrimitives.hostUserId === userId;

    if (shouldEndMeeting && meeting) {
      meeting.end(now);
      await this.meetingRepository.save(meeting);
    }

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
    if (shouldEndMeeting && meeting) {
      const endedMeeting = meeting.toPrimitives();
      this.logger.info("meeting.ended", {
        module: "meetings",
        useCase: "LeaveAttendance",
        action: "meeting.end",
        result: "host_departed",
        meetingId: endedMeeting.id,
        roomId: endedMeeting.roomId,
        status: endedMeeting.status,
      });
    }

    return primitives;
  }
}
