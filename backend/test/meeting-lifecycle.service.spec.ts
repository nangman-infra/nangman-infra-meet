import type { AppLogger } from "../src/common/logging/app-logger.service";
import { Attendance } from "../src/modules/attendance/domain/attendance.entity";
import { InMemoryAttendanceRepository } from "../src/modules/attendance/infrastructure/repositories/in-memory-attendance.repository";
import {
  getLatestClosedMeetingCleanupCutoff,
  MeetingLifecycleService,
} from "../src/modules/attendance/infrastructure/services/meeting-lifecycle.service";
import { Meeting } from "../src/modules/meetings/domain/meeting.entity";
import { InMemoryMeetingRepository } from "../src/modules/meetings/infrastructure/repositories/in-memory-meeting.repository";

const HOST_USER_ID = "@alice:matrix.nangman.cloud";

describe("MeetingLifecycleService", () => {
  function createService() {
    const attendanceRepository = new InMemoryAttendanceRepository();
    const meetingRepository = new InMemoryMeetingRepository();
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    return {
      attendanceRepository,
      meetingRepository,
      service: new MeetingLifecycleService(
        attendanceRepository,
        meetingRepository,
        logger as unknown as AppLogger,
      ),
    };
  }

  it("ends a live meeting when the host attendance goes stale", async () => {
    const { attendanceRepository, meetingRepository, service } = createService();
    const meeting = Meeting.create({
      id: "meeting-live-stale",
      title: "Live stale host",
      description: null,
      hostUserId: HOST_USER_ID,
      roomId: "!meeting-live-stale:matrix.nangman.cloud",
      roomAlias: null,
      joinUrl: "/room/live-stale-host",
      accessPolicy: "open",
      allowJoinBeforeHost: false,
      startsAt: null,
      now: new Date("2026-04-04T13:00:00.000Z"),
    });
    await meetingRepository.save(meeting);
    await attendanceRepository.save(
      Attendance.rehydrate({
        id: "attendance-host-stale",
        meetingId: meeting.id,
        userId: HOST_USER_ID,
        status: "present",
        joinedAt: "2026-04-04T13:00:00.000Z",
        lastSeenAt: "2026-04-04T13:30:00.000Z",
        leftAt: null,
        createdAt: "2026-04-04T13:00:00.000Z",
        updatedAt: "2026-04-04T13:30:00.000Z",
      }),
    );

    const autoEndedCount = await service.reconcileLiveMeetings(
      new Date("2026-04-04T13:33:00.000Z"),
    );

    expect(autoEndedCount).toBe(1);
    const endedMeeting = await meetingRepository.findById(meeting.id);
    expect(endedMeeting?.toPrimitives()).toEqual(
      expect.objectContaining({
        status: "ended",
        endsAt: "2026-04-04T13:31:30.000Z",
      }),
    );
    const attendances = await attendanceRepository.listByMeeting(meeting.id);
    expect(attendances[0]?.toPrimitives()).toEqual(
      expect.objectContaining({
        status: "left",
        leftAt: "2026-04-04T13:31:30.000Z",
      }),
    );
  });

  it("keeps live meetings alive when the host never established attendance", async () => {
    const { attendanceRepository, meetingRepository, service } = createService();
    const meeting = Meeting.create({
      id: "meeting-no-host-attendance",
      title: "No host attendance",
      description: null,
      hostUserId: HOST_USER_ID,
      roomId: "!meeting-no-host-attendance:matrix.nangman.cloud",
      roomAlias: null,
      joinUrl: "/room/no-host-attendance",
      accessPolicy: "open",
      allowJoinBeforeHost: false,
      startsAt: null,
      now: new Date("2026-04-04T13:00:00.000Z"),
    });
    await meetingRepository.save(meeting);
    await attendanceRepository.save(
      Attendance.rehydrate({
        id: "attendance-guest-only",
        meetingId: meeting.id,
        userId: "@bob:matrix.nangman.cloud",
        status: "present",
        joinedAt: "2026-04-04T13:01:00.000Z",
        lastSeenAt: "2026-04-04T13:01:00.000Z",
        leftAt: null,
        createdAt: "2026-04-04T13:01:00.000Z",
        updatedAt: "2026-04-04T13:01:00.000Z",
      }),
    );

    const autoEndedCount = await service.reconcileLiveMeetings(
      new Date("2026-04-04T13:05:00.000Z"),
    );

    expect(autoEndedCount).toBe(0);
    const currentMeeting = await meetingRepository.findById(meeting.id);
    expect(currentMeeting?.toPrimitives().status).toBe("live");
  });

  it("purges ended and cancelled meetings once the latest 04:00 KST cutoff has passed", async () => {
    const { meetingRepository, service } = createService();

    await meetingRepository.save(
      createClosedMeeting({
        id: "meeting-ended-before-cutoff",
        status: "ended",
        endsAt: "2026-04-04T18:50:00.000Z",
      }),
    );
    await meetingRepository.save(
      createClosedMeeting({
        id: "meeting-cancelled-before-cutoff",
        status: "cancelled",
        endsAt: "2026-04-04T18:59:59.000Z",
      }),
    );
    await meetingRepository.save(
      createClosedMeeting({
        id: "meeting-ended-after-cutoff",
        status: "ended",
        endsAt: "2026-04-04T19:05:00.000Z",
      }),
    );

    const deletedCount = await service.cleanupClosedMeetingsIfDue(
      new Date("2026-04-04T19:10:00.000Z"),
    );

    expect(deletedCount).toBe(2);
    await expect(
      meetingRepository.findById("meeting-ended-before-cutoff"),
    ).resolves.toBeNull();
    await expect(
      meetingRepository.findById("meeting-cancelled-before-cutoff"),
    ).resolves.toBeNull();
    await expect(
      meetingRepository.findById("meeting-ended-after-cutoff"),
    ).resolves.not.toBeNull();
  });

  it("uses the previous day cutoff before 04:00 KST and the same day cutoff after 04:00 KST", () => {
    expect(
      getLatestClosedMeetingCleanupCutoff(
        new Date("2026-04-04T18:59:00.000Z"),
      ).toISOString(),
    ).toBe("2026-04-03T19:00:00.000Z");

    expect(
      getLatestClosedMeetingCleanupCutoff(
        new Date("2026-04-04T19:01:00.000Z"),
      ).toISOString(),
    ).toBe("2026-04-04T19:00:00.000Z");
  });
});

function createClosedMeeting(params: {
  id: string;
  status: "ended" | "cancelled";
  endsAt: string;
}): Meeting {
  return Meeting.rehydrate({
    id: params.id,
    title: params.id,
    description: null,
    hostUserId: HOST_USER_ID,
    allowedUserIds: [],
    roomId: `!${params.id}:matrix.nangman.cloud`,
    roomAlias: null,
    joinUrl: `/room/${params.id}`,
    accessPolicy: "open",
    allowJoinBeforeHost: false,
    status: params.status,
    startsAt: null,
    endsAt: params.endsAt,
    createdAt: "2026-04-04T10:00:00.000Z",
    updatedAt: params.endsAt,
  });
}
