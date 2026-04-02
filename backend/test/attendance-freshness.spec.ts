import { Attendance } from "../src/modules/attendance/domain/attendance.entity";
import {
  ATTENDANCE_STALE_AFTER_MS,
  expireStaleAttendances,
} from "../src/modules/attendance/application/support/attendance-freshness";
import { AttendanceRepositoryPort } from "../src/modules/attendance/application/ports/attendance-repository.port";

describe("attendance freshness", () => {
  it("expires stale present attendances and persists the change", async () => {
    const save = jest.fn<Promise<void>, [Attendance]>().mockResolvedValue(undefined);
    const repository: AttendanceRepositoryPort = {
      findActiveByMeetingAndUser: async () => null,
      listByMeeting: async () => [],
      save,
    };
    const attendance = Attendance.rehydrate({
      id: "attendance-1",
      meetingId: "meeting-1",
      userId: "@alice:matrix.nangman.cloud",
      status: "present",
      joinedAt: "2026-03-18T01:00:00.000Z",
      lastSeenAt: "2026-03-18T01:01:00.000Z",
      leftAt: null,
      createdAt: "2026-03-18T01:00:00.000Z",
      updatedAt: "2026-03-18T01:01:00.000Z",
    });

    await expireStaleAttendances(
      repository,
      [attendance],
      new Date("2026-03-18T01:03:00.001Z"),
    );

    expect(save).toHaveBeenCalledWith(attendance);
    expect(attendance.toPrimitives()).toEqual(
      expect.objectContaining({
        status: "left",
        leftAt: new Date(
          Date.parse("2026-03-18T01:01:00.000Z") + ATTENDANCE_STALE_AFTER_MS,
        ).toISOString(),
      }),
    );
  });

  it("does not rewrite attendance that is still fresh", async () => {
    const save = jest.fn<Promise<void>, [Attendance]>().mockResolvedValue(undefined);
    const repository: AttendanceRepositoryPort = {
      findActiveByMeetingAndUser: async () => null,
      listByMeeting: async () => [],
      save,
    };
    const attendance = Attendance.rehydrate({
      id: "attendance-2",
      meetingId: "meeting-1",
      userId: "@alice:matrix.nangman.cloud",
      status: "present",
      joinedAt: "2026-03-18T01:00:00.000Z",
      lastSeenAt: "2026-03-18T01:01:45.000Z",
      leftAt: null,
      createdAt: "2026-03-18T01:00:00.000Z",
      updatedAt: "2026-03-18T01:01:45.000Z",
    });

    await expireStaleAttendances(
      repository,
      [attendance],
      new Date("2026-03-18T01:03:00.000Z"),
    );

    expect(save).not.toHaveBeenCalled();
    expect(attendance.toPrimitives().status).toBe("present");
  });
});
