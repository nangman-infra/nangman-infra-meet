import { MeetingAccessPolicy } from "./access-policy";
import { MeetingStatus } from "./meeting-status";

export interface MeetingPrimitives {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly hostUserId: string;
  readonly roomId: string;
  readonly roomAlias: string | null;
  readonly joinUrl: string;
  readonly accessPolicy: MeetingAccessPolicy;
  readonly allowJoinBeforeHost: boolean;
  readonly status: MeetingStatus;
  readonly startsAt: string | null;
  readonly endsAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateMeetingProps {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly hostUserId: string;
  readonly roomId: string;
  readonly roomAlias: string | null;
  readonly joinUrl: string;
  readonly accessPolicy: MeetingAccessPolicy;
  readonly allowJoinBeforeHost: boolean;
  readonly startsAt: Date | null;
  readonly now: Date;
}

export interface UpdateMeetingProps {
  readonly title?: string;
  readonly description?: string | null;
  readonly accessPolicy?: MeetingAccessPolicy;
  readonly allowJoinBeforeHost?: boolean;
  readonly startsAt?: Date | null;
}

export class Meeting {
  private constructor(
    private readonly idValue: string,
    private titleValue: string,
    private descriptionValue: string | null,
    private readonly hostUserIdValue: string,
    private readonly roomIdValue: string,
    private readonly roomAliasValue: string | null,
    private readonly joinUrlValue: string,
    private accessPolicyValue: MeetingAccessPolicy,
    private allowJoinBeforeHostValue: boolean,
    private statusValue: MeetingStatus,
    private startsAtValue: Date | null,
    private endsAtValue: Date | null,
    private readonly createdAtValue: Date,
    private updatedAtValue: Date,
  ) {}

  static create(props: CreateMeetingProps): Meeting {
    const startsAt = props.startsAt;
    const initialStatus =
      startsAt && startsAt.getTime() > props.now.getTime() ? "scheduled" : "live";

    return new Meeting(
      props.id,
      props.title,
      props.description,
      props.hostUserId,
      props.roomId,
      props.roomAlias,
      props.joinUrl,
      props.accessPolicy,
      props.allowJoinBeforeHost,
      initialStatus,
      startsAt,
      null,
      props.now,
      props.now,
    );
  }

  static rehydrate(primitives: MeetingPrimitives): Meeting {
    return new Meeting(
      primitives.id,
      primitives.title,
      primitives.description,
      primitives.hostUserId,
      primitives.roomId,
      primitives.roomAlias,
      primitives.joinUrl,
      primitives.accessPolicy,
      primitives.allowJoinBeforeHost,
      primitives.status,
      primitives.startsAt ? new Date(primitives.startsAt) : null,
      primitives.endsAt ? new Date(primitives.endsAt) : null,
      new Date(primitives.createdAt),
      new Date(primitives.updatedAt),
    );
  }

  get id(): string {
    return this.idValue;
  }

  update(props: UpdateMeetingProps, now: Date): void {
    if (this.statusValue === "ended") {
      return;
    }

    if (props.title !== undefined) {
      this.titleValue = props.title;
    }

    if (props.description !== undefined) {
      this.descriptionValue = props.description;
    }

    if (props.accessPolicy !== undefined) {
      this.accessPolicyValue = props.accessPolicy;
    }

    if (props.allowJoinBeforeHost !== undefined) {
      this.allowJoinBeforeHostValue = props.allowJoinBeforeHost;
    }

    if (props.startsAt !== undefined) {
      this.startsAtValue = props.startsAt;
      if (this.statusValue !== "live") {
        this.statusValue =
          props.startsAt && props.startsAt.getTime() > now.getTime()
            ? "scheduled"
            : "live";
      }
    }

    this.updatedAtValue = now;
  }

  start(now: Date): void {
    if (this.statusValue === "ended") {
      return;
    }

    this.statusValue = "live";
    this.updatedAtValue = now;
  }

  end(now: Date): void {
    if (this.statusValue === "ended") {
      return;
    }

    this.statusValue = "ended";
    this.endsAtValue ??= now;
    this.updatedAtValue = now;
  }

  toPrimitives(): MeetingPrimitives {
    return {
      id: this.idValue,
      title: this.titleValue,
      description: this.descriptionValue,
      hostUserId: this.hostUserIdValue,
      roomId: this.roomIdValue,
      roomAlias: this.roomAliasValue,
      joinUrl: this.joinUrlValue,
      accessPolicy: this.accessPolicyValue,
      allowJoinBeforeHost: this.allowJoinBeforeHostValue,
      status: this.statusValue,
      startsAt: this.startsAtValue?.toISOString() ?? null,
      endsAt: this.endsAtValue?.toISOString() ?? null,
      createdAt: this.createdAtValue.toISOString(),
      updatedAt: this.updatedAtValue.toISOString(),
    };
  }
}
