import { Injectable } from "@nestjs/common";
import { Meeting, MeetingPrimitives } from "../../domain/meeting.entity";
import { MeetingStatus } from "../../domain/meeting-status";
import { MeetingRepositoryPort } from "../../application/ports/meeting-repository.port";

@Injectable()
export class InMemoryMeetingRepository implements MeetingRepositoryPort {
  private readonly meetings = new Map<string, MeetingPrimitives>();

  async delete(id: string): Promise<void> {
    this.meetings.delete(id);
  }

  async findById(id: string): Promise<Meeting | null> {
    const meeting = this.meetings.get(id);
    return meeting ? Meeting.rehydrate(meeting) : null;
  }

  async list(): Promise<Meeting[]> {
    return Array.from(this.meetings.values()).map((meeting) =>
      Meeting.rehydrate(meeting),
    );
  }

  async listByStatuses(statuses: MeetingStatus[]): Promise<Meeting[]> {
    if (statuses.length === 0) {
      return [];
    }

    const allowedStatuses = new Set(statuses);
    return Array.from(this.meetings.values())
      .filter((meeting) => allowedStatuses.has(meeting.status))
      .map((meeting) => Meeting.rehydrate(meeting));
  }

  async save(meeting: Meeting): Promise<void> {
    this.meetings.set(meeting.id, meeting.toPrimitives());
  }
}
