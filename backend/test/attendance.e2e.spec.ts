import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "../src/app.module";
import { appConfig, AppConfig } from "../src/config/app.config";
import { configureApp } from "../src/bootstrap/configure-app";
import { testRequest } from "./test-request";

describe("AttendanceController", () => {
  let app: INestApplication;
  const api = () => testRequest(app);
  const hostUserId = "@alice:matrix.nangman.cloud";
  const guestUserId = "@bob:matrix.nangman.cloud";
  const outsiderUserId = "@charlie:matrix.nangman.cloud";

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app, app.get(appConfig.KEY) as AppConfig);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("joins, lists, leaves, and rejoins guest attendance sessions while the host stays live", async () => {
    const createMeetingResponse = await api()
      .post("/api/v1/meetings")
      .set("x-trace-id", "trace_attendance_flow")
      .set("x-matrix-user-id", hostUserId)
      .send({
        title: "Infra planning",
        hostUserId,
        roomId: "!room:matrix.nangman.cloud",
        joinUrl: "/room/infra-planning",
      });

    const meetingId = createMeetingResponse.body.data.id as string;

    const joinResponse = await api()
      .post(`/api/v1/meetings/${meetingId}/attendance/join`)
      .set("x-matrix-user-id", guestUserId);

    expect(joinResponse.status).toBe(201);
    expect(joinResponse.body.data).toEqual(
      expect.objectContaining({
        meetingId,
        userId: guestUserId,
        status: "present",
      }),
    );

    const listResponse = await api()
      .get(`/api/v1/meetings/${meetingId}/attendance`)
      .set("x-matrix-user-id", hostUserId);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          meetingId,
          userId: guestUserId,
          status: "present",
        }),
      ]),
    );

    const leaveResponse = await api()
      .post(`/api/v1/meetings/${meetingId}/attendance/leave`)
      .set("x-matrix-user-id", guestUserId);

    expect(leaveResponse.status).toBe(201);
    expect(leaveResponse.body.data).toEqual(
      expect.objectContaining({
        meetingId,
        userId: guestUserId,
        status: "left",
      }),
    );

    const rejoinResponse = await api()
      .post(`/api/v1/meetings/${meetingId}/attendance/join`)
      .set("x-matrix-user-id", guestUserId);

    expect(rejoinResponse.status).toBe(201);
    expect(rejoinResponse.body.data.id).not.toBe(joinResponse.body.data.id);
    expect(rejoinResponse.body.data.status).toBe("present");
  });

  it("ends a live meeting as soon as the host leaves attendance", async () => {
    const createMeetingResponse = await api()
      .post("/api/v1/meetings")
      .set("x-matrix-user-id", hostUserId)
      .send({
        title: "Host leave ends live meeting",
        hostUserId,
        roomId: "!room-host-leave:matrix.nangman.cloud",
        joinUrl: "/room/host-leave-ends-live",
      });

    const meetingId = createMeetingResponse.body.data.id as string;

    await api()
      .post(`/api/v1/meetings/${meetingId}/attendance/join`)
      .set("x-matrix-user-id", hostUserId);

    const leaveResponse = await api()
      .post(`/api/v1/meetings/${meetingId}/attendance/leave`)
      .set("x-matrix-user-id", hostUserId);

    expect(leaveResponse.status).toBe(201);
    expect(leaveResponse.body.data.status).toBe("left");

    const meetingResponse = await api()
      .get(`/api/v1/meetings/${meetingId}`)
      .set("x-matrix-user-id", hostUserId);

    expect(meetingResponse.status).toBe(200);
    expect(meetingResponse.body.data.status).toBe("ended");

    const guestJoinResponse = await api()
      .post(`/api/v1/meetings/${meetingId}/attendance/join`)
      .set("x-matrix-user-id", guestUserId);

    expect(guestJoinResponse.status).toBe(409);
    expect(guestJoinResponse.body.error.message).toBe(
      "This meeting is already closed.",
    );
  });

  it("requires an actor user for join and leave", async () => {
    const createMeetingResponse = await api()
      .post("/api/v1/meetings")
      .set("x-matrix-user-id", hostUserId)
      .send({
        title: "Infra planning",
        hostUserId,
        roomId: "!room-2:matrix.nangman.cloud",
        joinUrl: "/room/infra-planning-2",
      });

    const meetingId = createMeetingResponse.body.data.id as string;

    const joinResponse = await api().post(
      `/api/v1/meetings/${meetingId}/attendance/join`,
    );

    expect(joinResponse.status).toBe(400);
    expect(joinResponse.body.error.message).toBe(
      "Attendance actor user is required.",
    );
  });

  it("returns attendance summaries for multiple meetings", async () => {
    const firstMeetingResponse = await api()
      .post("/api/v1/meetings")
      .set("x-matrix-user-id", hostUserId)
      .send({
        title: "Infra planning",
        hostUserId,
        roomId: "!room-3:matrix.nangman.cloud",
        joinUrl: "/room/infra-planning-3",
      });

    const secondMeetingResponse = await api()
      .post("/api/v1/meetings")
      .set("x-matrix-user-id", hostUserId)
      .send({
        title: "Ops sync",
        hostUserId,
        roomId: "!room-4:matrix.nangman.cloud",
        joinUrl: "/room/ops-sync",
      });

    const firstMeetingId = firstMeetingResponse.body.data.id as string;
    const secondMeetingId = secondMeetingResponse.body.data.id as string;

    await api()
      .post(`/api/v1/meetings/${firstMeetingId}/attendance/join`)
      .set("x-matrix-user-id", hostUserId);
    await api()
      .post(`/api/v1/meetings/${firstMeetingId}/attendance/join`)
      .set("x-matrix-user-id", guestUserId);
    await api()
      .post(`/api/v1/meetings/${secondMeetingId}/attendance/join`)
      .set("x-matrix-user-id", hostUserId);
    await api()
      .post(`/api/v1/meetings/${secondMeetingId}/attendance/leave`)
      .set("x-matrix-user-id", hostUserId);

    const summaryResponse = await api()
      .get(
        `/api/v1/attendance/summaries?meetingId=${firstMeetingId}&meetingId=${secondMeetingId}`,
      )
      .set("x-matrix-user-id", hostUserId);

    expect(summaryResponse.status).toBe(200);
    expect(summaryResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          meetingId: firstMeetingId,
          presentCount: 2,
          participantCount: 2,
        }),
        expect.objectContaining({
          meetingId: secondMeetingId,
          presentCount: 0,
          participantCount: 1,
        }),
      ]),
    );
  });

  it("restricts detailed attendance to the meeting host", async () => {
    const createMeetingResponse = await api()
      .post("/api/v1/meetings")
      .set("x-matrix-user-id", hostUserId)
      .send({
        title: "Attendance access",
        hostUserId,
        roomId: "!room-5:matrix.nangman.cloud",
        joinUrl: "/room/attendance-access",
      });

    const meetingId = createMeetingResponse.body.data.id as string;

    await api()
      .post(`/api/v1/meetings/${meetingId}/attendance/join`)
      .set("x-matrix-user-id", hostUserId);
    await api()
      .post(`/api/v1/meetings/${meetingId}/attendance/join`)
      .set("x-matrix-user-id", guestUserId);

    const listResponse = await api()
      .get(`/api/v1/meetings/${meetingId}/attendance`)
      .set("x-matrix-user-id", guestUserId);

    expect(listResponse.status).toBe(403);
    expect(listResponse.body.error.message).toBe(
      "Only the meeting host can manage this meeting.",
    );
  });

  it("hides invite-only attendance summaries from unauthorized users", async () => {
    const createMeetingResponse = await api()
      .post("/api/v1/meetings")
      .set("x-matrix-user-id", hostUserId)
      .send({
        title: "Invite only attendance",
        hostUserId,
        roomId: "!room-6:matrix.nangman.cloud",
        joinUrl: "/room/invite-only-attendance",
        accessPolicy: "invite_only",
        allowedUserIds: [guestUserId],
      });

    const meetingId = createMeetingResponse.body.data.id as string;

    await api()
      .post(`/api/v1/meetings/${meetingId}/attendance/join`)
      .set("x-matrix-user-id", hostUserId);

    const outsiderSummaryResponse = await api()
      .get(`/api/v1/attendance/summaries?meetingId=${meetingId}`)
      .set("x-matrix-user-id", outsiderUserId);
    expect(outsiderSummaryResponse.status).toBe(200);
    expect(outsiderSummaryResponse.body.data).toEqual([]);

    const guestSummaryResponse = await api()
      .get(`/api/v1/attendance/summaries?meetingId=${meetingId}`)
      .set("x-matrix-user-id", guestUserId);
    expect(guestSummaryResponse.status).toBe(200);
    expect(guestSummaryResponse.body.data).toEqual([
      expect.objectContaining({
        meetingId,
        presentCount: 1,
        participantCount: 1,
      }),
    ]);
  });

  it("requires approval before a guest can join attendance for host approval meetings", async () => {
    const createMeetingResponse = await api()
      .post("/api/v1/meetings")
      .set("x-matrix-user-id", hostUserId)
      .send({
        title: "Approval gated attendance",
        hostUserId,
        roomId: "!room-7:matrix.nangman.cloud",
        joinUrl: "/room/approval-gated-attendance",
        accessPolicy: "host_approval",
        allowJoinBeforeHost: true,
      });

    const meetingId = createMeetingResponse.body.data.id as string;

    const blockedJoinResponse = await api()
      .post(`/api/v1/meetings/${meetingId}/attendance/join`)
      .set("x-matrix-user-id", guestUserId);

    expect(blockedJoinResponse.status).toBe(403);
    expect(blockedJoinResponse.body.error.message).toBe(
      "You do not have access to this meeting.",
    );

    const requestResponse = await api()
      .post(`/api/v1/meetings/${meetingId}/access-requests`)
      .set("x-matrix-user-id", guestUserId);
    const requestId = requestResponse.body.data.id as string;

    const pendingJoinResponse = await api()
      .post(`/api/v1/meetings/${meetingId}/attendance/join`)
      .set("x-matrix-user-id", guestUserId);

    expect(pendingJoinResponse.status).toBe(403);

    await api()
      .post(`/api/v1/meetings/${meetingId}/access-requests/${requestId}/approve`)
      .set("x-matrix-user-id", hostUserId);

    const approvedJoinResponse = await api()
      .post(`/api/v1/meetings/${meetingId}/attendance/join`)
      .set("x-matrix-user-id", guestUserId);

    expect(approvedJoinResponse.status).toBe(201);
    expect(approvedJoinResponse.body.data.status).toBe("present");
  });

  it("waits for the host before allowing attendance joins when early entry is disabled", async () => {
    const createMeetingResponse = await api()
      .post("/api/v1/meetings")
      .set("x-matrix-user-id", hostUserId)
      .send({
        title: "Wait for host attendance",
        hostUserId,
        roomId: "!room-8:matrix.nangman.cloud",
        joinUrl: "/room/wait-for-host-attendance",
        startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        allowJoinBeforeHost: false,
        accessPolicy: "open",
      });

    const meetingId = createMeetingResponse.body.data.id as string;

    const blockedJoinResponse = await api()
      .post(`/api/v1/meetings/${meetingId}/attendance/join`)
      .set("x-matrix-user-id", guestUserId);

    expect(blockedJoinResponse.status).toBe(409);
    expect(blockedJoinResponse.body.error.message).toBe(
      "This meeting is not open yet.",
    );

    await api()
      .post(`/api/v1/meetings/${meetingId}/start`)
      .set("x-matrix-user-id", hostUserId);

    const joinAfterStartResponse = await api()
      .post(`/api/v1/meetings/${meetingId}/attendance/join`)
      .set("x-matrix-user-id", guestUserId);

    expect(joinAfterStartResponse.status).toBe(201);
    expect(joinAfterStartResponse.body.data.status).toBe("present");
  });

  it("rejects attendance joins once a meeting has been cancelled", async () => {
    const createMeetingResponse = await api()
      .post("/api/v1/meetings")
      .set("x-matrix-user-id", hostUserId)
      .send({
        title: "Cancelled attendance",
        hostUserId,
        roomId: "!room-9:matrix.nangman.cloud",
        joinUrl: "/room/cancelled-attendance",
        startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

    const meetingId = createMeetingResponse.body.data.id as string;

    await api()
      .post(`/api/v1/meetings/${meetingId}/end`)
      .set("x-matrix-user-id", hostUserId);

    const joinResponse = await api()
      .post(`/api/v1/meetings/${meetingId}/attendance/join`)
      .set("x-matrix-user-id", guestUserId);

    expect(joinResponse.status).toBe(409);
    expect(joinResponse.body.error.message).toBe(
      "This meeting is already closed.",
    );
  });
});
