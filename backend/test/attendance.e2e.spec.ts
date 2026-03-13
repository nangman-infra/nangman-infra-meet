import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { appConfig, AppConfig } from "../src/config/app.config";
import { configureApp } from "../src/bootstrap/configure-app";

describe("AttendanceController", () => {
  let app: INestApplication;

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
      .set("x-matrix-user-id", "@alice:matrix.nangman.cloud")
      .send({
        title: "Infra planning",
        hostUserId: "@alice:matrix.nangman.cloud",
        roomId: "!room:matrix.nangman.cloud",
        joinUrl: "/room/infra-planning",
      });

    const meetingId = createMeetingResponse.body.data.id as string;

    const joinResponse = await request(app.getHttpServer())
      .post(`/api/v1/meetings/${meetingId}/attendance/join`)
      .set("x-matrix-user-id", "@alice:matrix.nangman.cloud");

    expect(joinResponse.status).toBe(201);
    expect(joinResponse.body.data).toEqual(
      expect.objectContaining({
        meetingId,
        userId: "@alice:matrix.nangman.cloud",
        status: "present",
      }),
    );

    const listResponse = await request(app.getHttpServer()).get(
      `/api/v1/meetings/${meetingId}/attendance`,
    );

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toEqual([
      expect.objectContaining({
        meetingId,
        userId: "@alice:matrix.nangman.cloud",
        status: "present",
      }),
    ]);

    const leaveResponse = await request(app.getHttpServer())
      .post(`/api/v1/meetings/${meetingId}/attendance/leave`)
      .set("x-matrix-user-id", "@alice:matrix.nangman.cloud");

    expect(leaveResponse.status).toBe(201);
    expect(leaveResponse.body.data).toEqual(
      expect.objectContaining({
        meetingId,
        userId: "@alice:matrix.nangman.cloud",
        status: "left",
      }),
    );

    const rejoinResponse = await request(app.getHttpServer())
      .post(`/api/v1/meetings/${meetingId}/attendance/join`)
      .set("x-matrix-user-id", "@alice:matrix.nangman.cloud");

    expect(rejoinResponse.status).toBe(201);
    expect(rejoinResponse.body.data.id).not.toBe(joinResponse.body.data.id);
    expect(rejoinResponse.body.data.status).toBe("present");
  });

  it("requires an actor user for join and leave", async () => {
    const createMeetingResponse = await request(app.getHttpServer())
      .post("/api/v1/meetings")
      .send({
        title: "Infra planning",
        hostUserId: "@alice:matrix.nangman.cloud",
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
      .set("x-matrix-user-id", "@alice:matrix.nangman.cloud")
      .send({
        title: "Infra planning",
        hostUserId: "@alice:matrix.nangman.cloud",
        roomId: "!room-3:matrix.nangman.cloud",
        joinUrl: "/room/infra-planning-3",
      });

    const secondMeetingResponse = await request(app.getHttpServer())
      .post("/api/v1/meetings")
      .set("x-matrix-user-id", "@alice:matrix.nangman.cloud")
      .send({
        title: "Ops sync",
        hostUserId: "@alice:matrix.nangman.cloud",
        roomId: "!room-4:matrix.nangman.cloud",
        joinUrl: "/room/ops-sync",
      });

    const firstMeetingId = firstMeetingResponse.body.data.id as string;
    const secondMeetingId = secondMeetingResponse.body.data.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/meetings/${firstMeetingId}/attendance/join`)
      .set("x-matrix-user-id", "@alice:matrix.nangman.cloud");
    await request(app.getHttpServer())
      .post(`/api/v1/meetings/${firstMeetingId}/attendance/join`)
      .set("x-matrix-user-id", "@bob:matrix.nangman.cloud");
    await request(app.getHttpServer())
      .post(`/api/v1/meetings/${secondMeetingId}/attendance/join`)
      .set("x-matrix-user-id", "@alice:matrix.nangman.cloud");
    await request(app.getHttpServer())
      .post(`/api/v1/meetings/${secondMeetingId}/attendance/leave`)
      .set("x-matrix-user-id", "@alice:matrix.nangman.cloud");

    const summaryResponse = await request(app.getHttpServer()).get(
      `/api/v1/attendance/summaries?meetingId=${firstMeetingId}&meetingId=${secondMeetingId}`,
    );

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
});
