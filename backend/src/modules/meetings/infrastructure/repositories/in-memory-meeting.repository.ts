import { Injectable } from "@nestjs/common";
import { Meeting, MeetingPrimitives } from "../../domain/meeting.entity";
import { MeetingRepositoryPort } from "../../application/ports/meeting-repository.port";

@Injectable()
export class InMemoryMeetingRepository implements MeetingRepositoryPort {
  private readonly meetings = new Map<string, MeetingPrimitives>();

  async findById(id: string): Promise<Meeting | null> {
    const meeting = this.meetings.get(id);
    return meeting ? Meeting.rehydrate(meeting) : null;
  }

  async list(): Promise<Meeting[]> {
    return Array.from(this.meetings.values()).map((meeting) =>
      Meeting.rehydrate(meeting),
    );
  }

  async save(meeting: Meeting): Promise<void> {
    this.meetings.set(meeting.id, meeting.toPrimitives());
  }
}
