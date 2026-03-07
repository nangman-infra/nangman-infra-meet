import { Meeting } from "../../domain/meeting.entity";

export const MEETING_REPOSITORY = Symbol("MEETING_REPOSITORY");

export interface MeetingRepositoryPort {
  findById(id: string): Promise<Meeting | null>;
  list(): Promise<Meeting[]>;
  save(meeting: Meeting): Promise<void>;
}
