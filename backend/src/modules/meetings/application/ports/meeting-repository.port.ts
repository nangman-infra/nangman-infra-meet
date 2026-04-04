import { Meeting } from "../../domain/meeting.entity";
import { MeetingStatus } from "../../domain/meeting-status";

export const MEETING_REPOSITORY = Symbol("MEETING_REPOSITORY");

export interface MeetingRepositoryPort {
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Meeting | null>;
  list(): Promise<Meeting[]>;
  listByStatuses(statuses: MeetingStatus[]): Promise<Meeting[]>;
  save(meeting: Meeting): Promise<void>;
}
