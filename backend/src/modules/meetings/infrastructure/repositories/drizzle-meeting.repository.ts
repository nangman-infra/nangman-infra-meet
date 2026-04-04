import { eq, inArray } from "drizzle-orm";
import { type AppDatabase } from "../../../../database/database.module";
import { meetings } from "../../../../database/schema";
import { Meeting, type MeetingPrimitives } from "../../domain/meeting.entity";
import { type MeetingRepositoryPort } from "../../application/ports/meeting-repository.port";
import { MeetingStatus } from "../../domain/meeting-status";

export class DrizzleMeetingRepository implements MeetingRepositoryPort {
  constructor(private readonly database: AppDatabase) {}

  async delete(id: string): Promise<void> {
    await this.database.delete(meetings).where(eq(meetings.id, id));
  }

  async findById(id: string): Promise<Meeting | null> {
    const [record] = await this.database
      .select()
      .from(meetings)
      .where(eq(meetings.id, id))
      .limit(1);

    return record ? Meeting.rehydrate(mapRecordToPrimitives(record)) : null;
  }

  async list(): Promise<Meeting[]> {
    const records = await this.database.select().from(meetings);
    return records.map((record) =>
      Meeting.rehydrate(mapRecordToPrimitives(record)),
    );
  }

  async listByStatuses(statuses: MeetingStatus[]): Promise<Meeting[]> {
    if (statuses.length === 0) {
      return [];
    }

    const records = await this.database
      .select()
      .from(meetings)
      .where(inArray(meetings.status, statuses));

    return records.map((record) =>
      Meeting.rehydrate(mapRecordToPrimitives(record)),
    );
  }

  async save(meeting: Meeting): Promise<void> {
    const primitives = meeting.toPrimitives();
    const row = mapPrimitivesToRow(primitives);

    await this.database
      .insert(meetings)
      .values(row)
      .onConflictDoUpdate({
        target: meetings.id,
        set: row,
      });
  }
}

type MeetingRow = typeof meetings.$inferSelect;
type MeetingInsertRow = typeof meetings.$inferInsert;

function mapRecordToPrimitives(record: MeetingRow): MeetingPrimitives {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    hostUserId: record.hostUserId,
    allowedUserIds: record.allowedUserIds,
    roomId: record.roomId,
    roomAlias: record.roomAlias,
    joinUrl: record.joinUrl,
    accessPolicy: record.accessPolicy,
    allowJoinBeforeHost: record.allowJoinBeforeHost,
    status: record.status,
    startsAt: record.startsAt?.toISOString() ?? null,
    endsAt: record.endsAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function mapPrimitivesToRow(primitives: MeetingPrimitives): MeetingInsertRow {
  return {
    id: primitives.id,
    title: primitives.title,
    description: primitives.description,
    hostUserId: primitives.hostUserId,
    allowedUserIds: primitives.allowedUserIds,
    roomId: primitives.roomId,
    roomAlias: primitives.roomAlias,
    joinUrl: primitives.joinUrl,
    accessPolicy: primitives.accessPolicy,
    allowJoinBeforeHost: primitives.allowJoinBeforeHost,
    status: primitives.status,
    startsAt: primitives.startsAt ? new Date(primitives.startsAt) : null,
    endsAt: primitives.endsAt ? new Date(primitives.endsAt) : null,
    createdAt: new Date(primitives.createdAt),
    updatedAt: new Date(primitives.updatedAt),
  };
}
