import { Attendance } from "../../domain/attendance.entity";
import { AttendanceRepositoryPort } from "../ports/attendance-repository.port";

export const ATTENDANCE_STALE_AFTER_MS = 90_000;

export async function expireStaleAttendances(
  repository: AttendanceRepositoryPort,
  attendances: Attendance[],
  now: Date,
): Promise<void> {
  await Promise.all(
    attendances.map(async (attendance) => {
      if (!attendance.isStale(now, ATTENDANCE_STALE_AFTER_MS)) {
        return;
      }

      const expiredAt = new Date(
        attendance.lastSeenAt.getTime() + ATTENDANCE_STALE_AFTER_MS,
      );
      attendance.expire(expiredAt);
      await repository.save(attendance);
    }),
  );
}
