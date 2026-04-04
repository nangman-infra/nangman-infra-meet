import { and, desc, eq } from "drizzle-orm";
import { AppDatabase } from "../../../../database/database.module";
import { meetingAccessRequests } from "../../../../database/schema";
import { MeetingAccessRequestRepositoryPort } from "../../application/ports/meeting-access-request-repository.port";
import {
  MeetingAccessRequest,
  MeetingAccessRequestPrimitives,
} from "../../domain/meeting-access-request.entity";

export class DrizzleMeetingAccessRequestRepository
  implements MeetingAccessRequestRepositoryPort
{
  constructor(private readonly database: AppDatabase) {}

  async findById(id: string): Promise<MeetingAccessRequest | null> {
    const [record] = await this.database
      .select()
      .from(meetingAccessRequests)
      .where(eq(meetingAccessRequests.id, id))
      .limit(1);

    return record
      ? MeetingAccessRequest.rehydrate(mapRecordToPrimitives(record))
      : null;
  }

  async findLatestByMeetingAndUser(
    meetingId: string,
    userId: string,
  ): Promise<MeetingAccessRequest | null> {
    const [record] = await this.database
      .select()
      .from(meetingAccessRequests)
      .where(
        and(
          eq(meetingAccessRequests.meetingId, meetingId),
          eq(meetingAccessRequests.userId, userId),
        ),
      )
      .orderBy(desc(meetingAccessRequests.updatedAt))
      .limit(1);

    return record
      ? MeetingAccessRequest.rehydrate(mapRecordToPrimitives(record))
      : null;
  }

  async listByMeeting(meetingId: string): Promise<MeetingAccessRequest[]> {
    const records = await this.database
      .select()
      .from(meetingAccessRequests)
      .where(eq(meetingAccessRequests.meetingId, meetingId));

    return records.map((record) =>
      MeetingAccessRequest.rehydrate(mapRecordToPrimitives(record)),
    );
  }

  async save(request: MeetingAccessRequest): Promise<void> {
    const primitives = request.toPrimitives();
    const row = mapPrimitivesToRow(primitives);

    await this.database
      .insert(meetingAccessRequests)
      .values(row)
      .onConflictDoUpdate({
        target: meetingAccessRequests.id,
        set: row,
      });
  }
}

type MeetingAccessRequestRow = typeof meetingAccessRequests.$inferSelect;
type MeetingAccessRequestInsertRow = typeof meetingAccessRequests.$inferInsert;

function mapRecordToPrimitives(
  record: MeetingAccessRequestRow,
): MeetingAccessRequestPrimitives {
  return {
    id: record.id,
    meetingId: record.meetingId,
    userId: record.userId,
    status: record.status,
    requestedAt: record.requestedAt.toISOString(),
    respondedAt: record.respondedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function mapPrimitivesToRow(
  primitives: MeetingAccessRequestPrimitives,
): MeetingAccessRequestInsertRow {
  return {
    id: primitives.id,
    meetingId: primitives.meetingId,
    userId: primitives.userId,
    status: primitives.status,
    requestedAt: new Date(primitives.requestedAt),
    respondedAt: primitives.respondedAt ? new Date(primitives.respondedAt) : null,
    createdAt: new Date(primitives.createdAt),
    updatedAt: new Date(primitives.updatedAt),
  };
}
