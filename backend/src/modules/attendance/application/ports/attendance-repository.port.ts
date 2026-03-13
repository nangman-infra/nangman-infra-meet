import { Attendance } from "../../domain/attendance.entity";

export const ATTENDANCE_REPOSITORY = Symbol("ATTENDANCE_REPOSITORY");

export interface AttendanceRepositoryPort {
  findActiveByMeetingAndUser(
    meetingId: string,
    userId: string,
  ): Promise<Attendance | null>;
  listByMeeting(meetingId: string): Promise<Attendance[]>;
  save(attendance: Attendance): Promise<void>;
}
