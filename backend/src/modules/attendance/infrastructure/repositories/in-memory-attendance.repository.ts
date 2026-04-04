import { Injectable } from "@nestjs/common";
import { Attendance, AttendancePrimitives } from "../../domain/attendance.entity";
import { AttendanceRepositoryPort } from "../../application/ports/attendance-repository.port";

@Injectable()
export class InMemoryAttendanceRepository implements AttendanceRepositoryPort {
  private readonly attendances = new Map<string, AttendancePrimitives>();

  async findActiveByMeetingAndUser(
    meetingId: string,
    userId: string,
  ): Promise<Attendance | null> {
    const attendance = Array.from(this.attendances.values())
      .filter(
        (entry) =>
          entry.meetingId === meetingId &&
          entry.userId === userId &&
          entry.status === "present",
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];

    return attendance ? Attendance.rehydrate(attendance) : null;
  }

  async listByMeeting(meetingId: string): Promise<Attendance[]> {
    return Array.from(this.attendances.values())
      .filter((attendance) => attendance.meetingId === meetingId)
      .map((attendance) => Attendance.rehydrate(attendance));
  }

  async save(attendance: Attendance): Promise<void> {
    this.attendances.set(attendance.id, attendance.toPrimitives());
  }
}
