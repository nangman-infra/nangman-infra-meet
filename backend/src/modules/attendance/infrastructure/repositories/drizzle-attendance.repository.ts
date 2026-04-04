import { and, desc, eq } from "drizzle-orm";
import { AppDatabase } from "../../../../database/database.module";
import { attendances } from "../../../../database/schema";
import { AttendanceRepositoryPort } from "../../application/ports/attendance-repository.port";
import { Attendance, AttendancePrimitives } from "../../domain/attendance.entity";

export class DrizzleAttendanceRepository implements AttendanceRepositoryPort {
  constructor(private readonly database: AppDatabase) {}

  async findActiveByMeetingAndUser(
    meetingId: string,
    userId: string,
  ): Promise<Attendance | null> {
    const [record] = await this.database
      .select()
      .from(attendances)
      .where(
        and(
          eq(attendances.meetingId, meetingId),
          eq(attendances.userId, userId),
          eq(attendances.status, "present"),
        ),
      )
      .orderBy(desc(attendances.updatedAt))
      .limit(1);

    return record ? Attendance.rehydrate(mapRecordToPrimitives(record)) : null;
  }

  async listByMeeting(meetingId: string): Promise<Attendance[]> {
    const records = await this.database
      .select()
      .from(attendances)
      .where(eq(attendances.meetingId, meetingId));

    return records.map((record) =>
      Attendance.rehydrate(mapRecordToPrimitives(record)),
    );
  }

  async save(attendance: Attendance): Promise<void> {
    const primitives = attendance.toPrimitives();
    const row = mapPrimitivesToRow(primitives);

    await this.database
      .insert(attendances)
      .values(row)
      .onConflictDoUpdate({
        target: attendances.id,
        set: row,
      });
  }
}

type AttendanceRow = typeof attendances.$inferSelect;
type AttendanceInsertRow = typeof attendances.$inferInsert;

function mapRecordToPrimitives(record: AttendanceRow): AttendancePrimitives {
  return {
    id: record.id,
    meetingId: record.meetingId,
    userId: record.userId,
    status: record.status,
    joinedAt: record.joinedAt.toISOString(),
    lastSeenAt: record.lastSeenAt.toISOString(),
    leftAt: record.leftAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function mapPrimitivesToRow(
  primitives: AttendancePrimitives,
): AttendanceInsertRow {
  return {
    id: primitives.id,
    meetingId: primitives.meetingId,
    userId: primitives.userId,
    status: primitives.status,
    joinedAt: new Date(primitives.joinedAt),
    lastSeenAt: new Date(primitives.lastSeenAt),
    leftAt: primitives.leftAt ? new Date(primitives.leftAt) : null,
    createdAt: new Date(primitives.createdAt),
    updatedAt: new Date(primitives.updatedAt),
  };
}
