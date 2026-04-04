import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AppLogger } from "../../../../common/logging/app-logger.service";
import {
  MEETING_REPOSITORY,
  MeetingRepositoryPort,
} from "../../../meetings/application/ports/meeting-repository.port";
import { EvaluateMeetingEntryAccessUseCase } from "../../../moderation/application/use-cases/evaluate-meeting-entry-access.use-case";
import { assertMeetingEntryAllowed } from "../../../moderation/application/support/assert-meeting-entry-allowed";
import { Attendance, AttendancePrimitives } from "../../domain/attendance.entity";
import {
  ATTENDANCE_REPOSITORY,
  AttendanceRepositoryPort,
} from "../ports/attendance-repository.port";
import { assertMeetingExists } from "../support/assert-meeting-exists";
import { resolveAttendanceActorUserId } from "../support/resolve-attendance-actor-user-id";

@Injectable()
export class JoinAttendanceUseCase {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly repository: AttendanceRepositoryPort,
    @Inject(MEETING_REPOSITORY)
    private readonly meetingRepository: MeetingRepositoryPort,
    private readonly evaluateMeetingEntryAccessUseCase: EvaluateMeetingEntryAccessUseCase,
    private readonly logger: AppLogger,
  ) {}

  async execute(meetingId: string): Promise<AttendancePrimitives> {
    const userId = resolveAttendanceActorUserId();
    const now = new Date();
    await assertMeetingExists(this.meetingRepository, meetingId);
    const entryDecision =
      await this.evaluateMeetingEntryAccessUseCase.execute(meetingId);
    assertMeetingEntryAllowed(entryDecision);

    const existingAttendance = await this.repository.findActiveByMeetingAndUser(
      meetingId,
      userId,
    );

    const attendance =
      existingAttendance ??
      Attendance.create({
        id: randomUUID(),
        meetingId,
        userId,
        now,
      });

    attendance.markPresent(now);
    await this.repository.save(attendance);

    const primitives = attendance.toPrimitives();
    this.logger.info("attendance.joined", {
      module: "attendance",
      useCase: "JoinAttendance",
      action: "attendance.join",
      result: existingAttendance ? "refreshed" : "success",
      attendanceId: primitives.id,
      meetingId: primitives.meetingId,
      actorUserId: userId,
      status: primitives.status,
    });

    return primitives;
  }
}
