import { Inject, Injectable } from "@nestjs/common";
import { AppLogger } from "../../../../common/logging/app-logger.service";
import {
  MEETING_REPOSITORY,
  MeetingRepositoryPort,
} from "../../../meetings/application/ports/meeting-repository.port";
import { MeetingNotFoundError } from "../../../meetings/application/errors/meeting-not-found.error";
import { type MeetingPrimitives } from "../../../meetings/domain/meeting.entity";
import {
  MEETING_ACCESS_REQUEST_REPOSITORY,
  MeetingAccessRequestRepositoryPort,
} from "../ports/meeting-access-request-repository.port";
import { type AccessRequestStatus } from "../../domain/access-request-status";
import { resolveModerationActorUserId } from "../support/resolve-moderation-actor-user-id";
import {
  type MeetingEntryAccessDecision,
  type MeetingEntryAccessDecisionKind,
} from "../read-models/meeting-entry-access-decision";

@Injectable()
export class EvaluateMeetingEntryAccessUseCase {
  constructor(
    @Inject(MEETING_REPOSITORY)
    private readonly meetingRepository: MeetingRepositoryPort,
    @Inject(MEETING_ACCESS_REQUEST_REPOSITORY)
    private readonly accessRequestRepository: MeetingAccessRequestRepositoryPort,
    private readonly logger: AppLogger,
  ) {}

  async execute(meetingId: string): Promise<MeetingEntryAccessDecision> {
    const actorUserId = resolveModerationActorUserId();
    const meeting = await this.meetingRepository.findById(meetingId);
    if (!meeting) {
      throw new MeetingNotFoundError(meetingId);
    }

    const primitives = meeting.toPrimitives();
    const baseDecision = {
      meetingId: primitives.id,
      title: primitives.title,
      hostUserId: primitives.hostUserId,
      status: primitives.status,
      accessPolicy: primitives.accessPolicy,
      allowJoinBeforeHost: primitives.allowJoinBeforeHost,
    } as const;

    const kind = await this.resolveDecisionKind(
      meetingId,
      actorUserId,
      primitives,
    );

    this.logger.info("meeting.entry_access_evaluated", {
      module: "moderation",
      useCase: "EvaluateMeetingEntryAccess",
      action: "meeting.entry_access.evaluate",
      result: kind,
      meetingId: primitives.id,
      actorUserId,
      accessPolicy: primitives.accessPolicy,
      meetingStatus: primitives.status,
    });

    return {
      kind,
      ...baseDecision,
    };
  }

  private async resolveDecisionKind(
    meetingId: string,
    actorUserId: string,
    meeting: MeetingPrimitives,
  ): Promise<MeetingEntryAccessDecisionKind> {
    if (this.isClosedMeeting(meeting)) {
      return "meeting_closed";
    }

    if (meeting.hostUserId === actorUserId) {
      return "allow";
    }

    const participantDecision = await this.resolveParticipantDecision(
      meetingId,
      actorUserId,
      meeting,
    );

    return this.requiresHostPresence(meeting, participantDecision)
      ? "wait_for_host"
      : participantDecision;
  }

  private isClosedMeeting(meeting: MeetingPrimitives): boolean {
    return meeting.status === "ended" || meeting.status === "cancelled";
  }

  private requiresHostPresence(
    meeting: MeetingPrimitives,
    decision: MeetingEntryAccessDecisionKind,
  ): boolean {
    return (
      decision === "allow" &&
      meeting.status === "scheduled" &&
      !meeting.allowJoinBeforeHost
    );
  }

  private async resolveParticipantDecision(
    meetingId: string,
    actorUserId: string,
    meeting: MeetingPrimitives,
  ): Promise<MeetingEntryAccessDecisionKind> {
    if (meeting.accessPolicy === "invite_only") {
      return meeting.allowedUserIds.includes(actorUserId)
        ? "allow"
        : "not_invited";
    }

    if (meeting.accessPolicy !== "host_approval") {
      return "allow";
    }

    const latestRequest =
      await this.accessRequestRepository.findLatestByMeetingAndUser(
        meetingId,
        actorUserId,
      );

    return this.mapAccessRequestStatusToDecision(latestRequest?.status);
  }

  private mapAccessRequestStatusToDecision(
    status: AccessRequestStatus | undefined,
  ): MeetingEntryAccessDecisionKind {
    switch (status) {
      case undefined:
        return "request_access";
      case "approved":
        return "allow";
      case "pending":
        return "pending_approval";
      case "rejected":
        return "rejected";
    }
  }
}
