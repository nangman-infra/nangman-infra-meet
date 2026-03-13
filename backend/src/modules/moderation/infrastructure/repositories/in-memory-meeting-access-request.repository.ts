import { Injectable } from "@nestjs/common";
import { MeetingAccessRequest, MeetingAccessRequestPrimitives } from "../../domain/meeting-access-request.entity";
import { MeetingAccessRequestRepositoryPort } from "../../application/ports/meeting-access-request-repository.port";

@Injectable()
export class InMemoryMeetingAccessRequestRepository
  implements MeetingAccessRequestRepositoryPort
{
  private readonly requests = new Map<string, MeetingAccessRequestPrimitives>();

  async findById(id: string): Promise<MeetingAccessRequest | null> {
    const request = this.requests.get(id);
    return request ? MeetingAccessRequest.rehydrate(request) : null;
  }

  async findLatestByMeetingAndUser(
    meetingId: string,
    userId: string,
  ): Promise<MeetingAccessRequest | null> {
    const request = Array.from(this.requests.values())
      .filter(
        (entry) => entry.meetingId === meetingId && entry.userId === userId,
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];

    return request ? MeetingAccessRequest.rehydrate(request) : null;
  }

  async listByMeeting(meetingId: string): Promise<MeetingAccessRequest[]> {
    return Array.from(this.requests.values())
      .filter((entry) => entry.meetingId === meetingId)
      .map((entry) => MeetingAccessRequest.rehydrate(entry));
  }

  async save(request: MeetingAccessRequest): Promise<void> {
    this.requests.set(request.id, request.toPrimitives());
  }
}
