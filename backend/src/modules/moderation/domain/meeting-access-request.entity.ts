import { AccessRequestStatus } from "./access-request-status";

export interface MeetingAccessRequestPrimitives {
  readonly id: string;
  readonly meetingId: string;
  readonly userId: string;
  readonly status: AccessRequestStatus;
  readonly requestedAt: string;
  readonly respondedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateMeetingAccessRequestProps {
  readonly id: string;
  readonly meetingId: string;
  readonly userId: string;
  readonly now: Date;
}

export class MeetingAccessRequest {
  private constructor(
    private readonly idValue: string,
    private readonly meetingIdValue: string,
    private readonly userIdValue: string,
    private statusValue: AccessRequestStatus,
    private readonly requestedAtValue: Date,
    private respondedAtValue: Date | null,
    private readonly createdAtValue: Date,
    private updatedAtValue: Date,
  ) {}

  static create(props: CreateMeetingAccessRequestProps): MeetingAccessRequest {
    return new MeetingAccessRequest(
      props.id,
      props.meetingId,
      props.userId,
      "pending",
      props.now,
      null,
      props.now,
      props.now,
    );
  }

  static rehydrate(
    primitives: MeetingAccessRequestPrimitives,
  ): MeetingAccessRequest {
    return new MeetingAccessRequest(
      primitives.id,
      primitives.meetingId,
      primitives.userId,
      primitives.status,
      new Date(primitives.requestedAt),
      primitives.respondedAt ? new Date(primitives.respondedAt) : null,
      new Date(primitives.createdAt),
      new Date(primitives.updatedAt),
    );
  }

  get id(): string {
    return this.idValue;
  }

  get meetingId(): string {
    return this.meetingIdValue;
  }

  get userId(): string {
    return this.userIdValue;
  }

  get status(): AccessRequestStatus {
    return this.statusValue;
  }

  approve(now: Date): void {
    this.statusValue = "approved";
    this.respondedAtValue = now;
    this.updatedAtValue = now;
  }

  reject(now: Date): void {
    this.statusValue = "rejected";
    this.respondedAtValue = now;
    this.updatedAtValue = now;
  }

  toPrimitives(): MeetingAccessRequestPrimitives {
    return {
      id: this.idValue,
      meetingId: this.meetingIdValue,
      userId: this.userIdValue,
      status: this.statusValue,
      requestedAt: this.requestedAtValue.toISOString(),
      respondedAt: this.respondedAtValue?.toISOString() ?? null,
      createdAt: this.createdAtValue.toISOString(),
      updatedAt: this.updatedAtValue.toISOString(),
    };
  }
}
