import { AttendanceStatus } from "./attendance-status";

export interface AttendancePrimitives {
  readonly id: string;
  readonly meetingId: string;
  readonly userId: string;
  readonly status: AttendanceStatus;
  readonly joinedAt: string;
  readonly lastSeenAt: string;
  readonly leftAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateAttendanceProps {
  readonly id: string;
  readonly meetingId: string;
  readonly userId: string;
  readonly now: Date;
}

export class Attendance {
  private constructor(
    private readonly idValue: string,
    private readonly meetingIdValue: string,
    private readonly userIdValue: string,
    private statusValue: AttendanceStatus,
    private readonly joinedAtValue: Date,
    private lastSeenAtValue: Date,
    private leftAtValue: Date | null,
    private readonly createdAtValue: Date,
    private updatedAtValue: Date,
  ) {}

  static create(props: CreateAttendanceProps): Attendance {
    return new Attendance(
      props.id,
      props.meetingId,
      props.userId,
      "present",
      props.now,
      props.now,
      null,
      props.now,
      props.now,
    );
  }

  static rehydrate(primitives: AttendancePrimitives): Attendance {
    return new Attendance(
      primitives.id,
      primitives.meetingId,
      primitives.userId,
      primitives.status,
      new Date(primitives.joinedAt),
      new Date(primitives.lastSeenAt),
      primitives.leftAt ? new Date(primitives.leftAt) : null,
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

  get isPresent(): boolean {
    return this.statusValue === "present";
  }

  get lastSeenAt(): Date {
    return new Date(this.lastSeenAtValue);
  }

  markPresent(now: Date): void {
    this.statusValue = "present";
    this.leftAtValue = null;
    this.lastSeenAtValue = now;
    this.updatedAtValue = now;
  }

  leave(now: Date): void {
    if (this.statusValue === "left") {
      return;
    }

    this.statusValue = "left";
    this.leftAtValue = now;
    this.lastSeenAtValue = now;
    this.updatedAtValue = now;
  }

  expire(expiredAt: Date): void {
    if (this.statusValue === "left") {
      return;
    }

    this.statusValue = "left";
    this.leftAtValue = expiredAt;
    this.lastSeenAtValue = expiredAt;
    this.updatedAtValue = expiredAt;
  }

  isStale(now: Date, staleAfterMs: number): boolean {
    return (
      this.statusValue === "present" &&
      now.getTime() - this.lastSeenAtValue.getTime() > staleAfterMs
    );
  }

  toPrimitives(): AttendancePrimitives {
    return {
      id: this.idValue,
      meetingId: this.meetingIdValue,
      userId: this.userIdValue,
      status: this.statusValue,
      joinedAt: this.joinedAtValue.toISOString(),
      lastSeenAt: this.lastSeenAtValue.toISOString(),
      leftAt: this.leftAtValue?.toISOString() ?? null,
      createdAt: this.createdAtValue.toISOString(),
      updatedAt: this.updatedAtValue.toISOString(),
    };
  }
}
