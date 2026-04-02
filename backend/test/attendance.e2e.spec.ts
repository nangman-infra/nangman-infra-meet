import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { appConfig, AppConfig } from "../src/config/app.config";
import { configureApp } from "../src/bootstrap/configure-app";

describe("AttendanceController", () => {
  let app: INestApplication;
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

  it("joins, lists, leaves, and rejoins attendance sessions", async () => {
    const createMeetingResponse = await request(app.getHttpServer())
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

    const joinResponse = await request(app.getHttpServer())
      .post(`/api/v1/meetings/${meetingId}/attendance/join`)
      .set("x-matrix-user-id", hostUserId);

    expect(joinResponse.status).toBe(201);
    expect(joinResponse.body.data).toEqual(
      expect.objectContaining({
        meetingId,
        userId: hostUserId,
        status: "present",
      }),
    );

    const listResponse = await request(app.getHttpServer())
      .get(`/api/v1/meetings/${meetingId}/attendance`)
      .set("x-matrix-user-id", hostUserId);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toEqual([
      expect.objectContaining({
        meetingId,
        userId: hostUserId,
        status: "present",
      }),
    ]);

    const leaveResponse = await request(app.getHttpServer())
      .post(`/api/v1/meetings/${meetingId}/attendance/leave`)
      .set("x-matrix-user-id", hostUserId);

    expect(leaveResponse.status).toBe(201);
    expect(leaveResponse.body.data).toEqual(
      expect.objectContaining({
        meetingId,
        userId: hostUserId,
        status: "left",
      }),
    );

    const rejoinResponse = await request(app.getHttpServer())
      .post(`/api/v1/meetings/${meetingId}/attendance/join`)
      .set("x-matrix-user-id", hostUserId);

    expect(rejoinResponse.status).toBe(201);
    expect(rejoinResponse.body.data.id).not.toBe(joinResponse.body.data.id);
    expect(rejoinResponse.body.data.status).toBe("present");
  });

  it("requires an actor user for join and leave", async () => {
    const createMeetingResponse = await request(app.getHttpServer())
      .post("/api/v1/meetings")
      .set("x-matrix-user-id", hostUserId)
      .send({
        title: "Infra planning",
        hostUserId,
        roomId: "!room-2:matrix.nangman.cloud",
        joinUrl: "/room/infra-planning-2",
      });

    const meetingId = createMeetingResponse.body.data.id as string;

    const joinResponse = await request(app.getHttpServer()).post(
      `/api/v1/meetings/${meetingId}/attendance/join`,
    );

    expect(joinResponse.status).toBe(400);
    expect(joinResponse.body.error.message).toBe(
      "Attendance actor user is required.",
    );
  });

  it("returns attendance summaries for multiple meetings", async () => {
    const firstMeetingResponse = await request(app.getHttpServer())
      .post("/api/v1/meetings")
      .set("x-matrix-user-id", hostUserId)
      .send({
        title: "Infra planning",
        hostUserId,
        roomId: "!room-3:matrix.nangman.cloud",
        joinUrl: "/room/infra-planning-3",
      });

    const secondMeetingResponse = await request(app.getHttpServer())
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

    await request(app.getHttpServer())
      .post(`/api/v1/meetings/${firstMeetingId}/attendance/join`)
      .set("x-matrix-user-id", hostUserId);
    await request(app.getHttpServer())
      .post(`/api/v1/meetings/${firstMeetingId}/attendance/join`)
      .set("x-matrix-user-id", guestUserId);
    await request(app.getHttpServer())
      .post(`/api/v1/meetings/${secondMeetingId}/attendance/join`)
      .set("x-matrix-user-id", hostUserId);
    await request(app.getHttpServer())
      .post(`/api/v1/meetings/${secondMeetingId}/attendance/leave`)
      .set("x-matrix-user-id", hostUserId);

    const summaryResponse = await request(app.getHttpServer())
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
    const createMeetingResponse = await request(app.getHttpServer())
      .post("/api/v1/meetings")
      .set("x-matrix-user-id", hostUserId)
      .send({
        title: "Attendance access",
        hostUserId,
        roomId: "!room-5:matrix.nangman.cloud",
        joinUrl: "/room/attendance-access",
      });

    const meetingId = createMeetingResponse.body.data.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/meetings/${meetingId}/attendance/join`)
      .set("x-matrix-user-id", hostUserId);
    await request(app.getHttpServer())
      .post(`/api/v1/meetings/${meetingId}/attendance/join`)
      .set("x-matrix-user-id", guestUserId);

    const listResponse = await request(app.getHttpServer())
      .get(`/api/v1/meetings/${meetingId}/attendance`)
      .set("x-matrix-user-id", guestUserId);

    expect(listResponse.status).toBe(403);
    expect(listResponse.body.error.message).toBe(
      "Only the meeting host can manage this meeting.",
    );
  });

  it("hides invite-only attendance summaries from unauthorized users", async () => {
    const createMeetingResponse = await request(app.getHttpServer())
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

    await request(app.getHttpServer())
      .post(`/api/v1/meetings/${meetingId}/attendance/join`)
      .set("x-matrix-user-id", hostUserId);

    const outsiderSummaryResponse = await request(app.getHttpServer())
      .get(`/api/v1/attendance/summaries?meetingId=${meetingId}`)
      .set("x-matrix-user-id", outsiderUserId);
    expect(outsiderSummaryResponse.status).toBe(200);
    expect(outsiderSummaryResponse.body.data).toEqual([]);

    const guestSummaryResponse = await request(app.getHttpServer())
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
});
