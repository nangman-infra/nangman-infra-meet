import {
  Inject,
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "@nestjs/common";
import { AppLogger } from "../../../../common/logging/app-logger.service";
import {
  MEETING_REPOSITORY,
  MeetingRepositoryPort,
} from "../../../meetings/application/ports/meeting-repository.port";
import { Meeting } from "../../../meetings/domain/meeting.entity";
import {
  ATTENDANCE_REPOSITORY,
  AttendanceRepositoryPort,
} from "../../application/ports/attendance-repository.port";
import {
  ATTENDANCE_STALE_AFTER_MS,
  expireStaleAttendances,
} from "../../application/support/attendance-freshness";
import { Attendance } from "../../domain/attendance.entity";

export const MEETING_LIFECYCLE_TICK_INTERVAL_MS = 60_000;
export const CLOSED_MEETING_CLEANUP_HOUR_KST = 4;

const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

@Injectable()
export class MeetingLifecycleService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private intervalHandle: NodeJS.Timeout | null = null;
  private isTickRunning = false;
  private lastCleanupCutoffIso: string | null = null;

  constructor(
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly attendanceRepository: AttendanceRepositoryPort,
    @Inject(MEETING_REPOSITORY)
    private readonly meetingRepository: MeetingRepositoryPort,
    private readonly logger: AppLogger,
  ) {}

  onApplicationBootstrap(): void {
    if (process.env.NODE_ENV === "test") {
      return;
    }

    this.intervalHandle = setInterval(() => {
      void this.tick();
    }, MEETING_LIFECYCLE_TICK_INTERVAL_MS);

    void this.tick();
  }

  onApplicationShutdown(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  async tick(now: Date = new Date()): Promise<void> {
    if (this.isTickRunning) {
      this.logger.warn("meeting.lifecycle.tick_skipped", {
        module: "attendance",
        service: "MeetingLifecycleService",
        reason: "already_running",
      });
      return;
    }

    this.isTickRunning = true;

    try {
      await this.reconcileLiveMeetings(now);
      await this.cleanupClosedMeetingsIfDue(now);
    } catch (error) {
      this.logger.error(
        "meeting.lifecycle.tick_failed",
        {
          module: "attendance",
          service: "MeetingLifecycleService",
          action: "meeting.lifecycle.tick",
          result: "error",
        },
        error,
      );
    } finally {
      this.isTickRunning = false;
    }
  }

  async reconcileLiveMeetings(now: Date = new Date()): Promise<number> {
    const liveMeetings = await this.meetingRepository.listByStatuses(["live"]);
    let autoEndedCount = 0;

    for (const meeting of liveMeetings) {
      const hostExpiredAt = await this.expireAttendancesAndResolveHostTimeout(
        meeting,
        now,
      );

      if (!hostExpiredAt) {
        continue;
      }

      meeting.end(hostExpiredAt);
      await this.meetingRepository.save(meeting);
      const primitives = meeting.toPrimitives();
      autoEndedCount += 1;

      this.logger.info("meeting.auto_ended", {
        module: "attendance",
        service: "MeetingLifecycleService",
        action: "meeting.lifecycle.reconcile",
        result: "host_stale",
        meetingId: primitives.id,
        hostUserId: primitives.hostUserId,
        endedAt: primitives.endsAt,
      });
    }

    return autoEndedCount;
  }

  async cleanupClosedMeetingsIfDue(now: Date = new Date()): Promise<number> {
    const cutoff = getLatestClosedMeetingCleanupCutoff(now);
    const cutoffIso = cutoff.toISOString();

    if (this.lastCleanupCutoffIso === cutoffIso) {
      return 0;
    }

    const closedMeetings = await this.meetingRepository.listByStatuses([
      "cancelled",
      "ended",
    ]);
    let deletedCount = 0;

    for (const meeting of closedMeetings) {
      const primitives = meeting.toPrimitives();
      const closedAt = primitives.endsAt
        ? new Date(primitives.endsAt)
        : new Date(primitives.updatedAt);

      if (closedAt.getTime() > cutoff.getTime()) {
        continue;
      }

      await this.meetingRepository.delete(primitives.id);
      deletedCount += 1;
    }

    this.lastCleanupCutoffIso = cutoffIso;
    this.logger.info("meeting.closed_cleanup_completed", {
      module: "attendance",
      service: "MeetingLifecycleService",
      action: "meeting.lifecycle.cleanup",
      result: "success",
      deletedCount,
      cutoff: cutoffIso,
    });

    return deletedCount;
  }

  private async expireAttendancesAndResolveHostTimeout(
    meeting: Meeting,
    now: Date,
  ): Promise<Date | null> {
    const meetingPrimitives = meeting.toPrimitives();
    const attendances = await this.attendanceRepository.listByMeeting(
      meetingPrimitives.id,
    );
    const hostAttendance = getLatestPresentAttendanceForUser(
      attendances,
      meetingPrimitives.hostUserId,
    );
    const hostExpiredAt =
      hostAttendance?.isStale(now, ATTENDANCE_STALE_AFTER_MS) === true
        ? new Date(
            hostAttendance.lastSeenAt.getTime() + ATTENDANCE_STALE_AFTER_MS,
          )
        : null;

    await expireStaleAttendances(this.attendanceRepository, attendances, now);
    return hostExpiredAt;
  }
}

function getLatestPresentAttendanceForUser(
  attendances: Attendance[],
  userId: string,
): Attendance | null {
  return (
    attendances
      .filter((attendance) => attendance.userId === userId && attendance.isPresent)
      .sort(
        (left, right) =>
          right.lastSeenAt.getTime() - left.lastSeenAt.getTime(),
      )[0] ?? null
  );
}

export function getLatestClosedMeetingCleanupCutoff(now: Date): Date {
  const seoulNow = new Date(now.getTime() + SEOUL_OFFSET_MS);
  const cleanupDate = new Date(
    Date.UTC(
      seoulNow.getUTCFullYear(),
      seoulNow.getUTCMonth(),
      seoulNow.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );

  if (seoulNow.getUTCHours() < CLOSED_MEETING_CLEANUP_HOUR_KST) {
    cleanupDate.setUTCDate(cleanupDate.getUTCDate() - 1);
  }

  return new Date(
    Date.UTC(
      cleanupDate.getUTCFullYear(),
      cleanupDate.getUTCMonth(),
      cleanupDate.getUTCDate(),
      CLOSED_MEETING_CLEANUP_HOUR_KST,
      0,
      0,
      0,
    ) - SEOUL_OFFSET_MS,
  );
}
