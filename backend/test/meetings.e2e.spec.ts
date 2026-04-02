import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { appConfig, AppConfig } from "../src/config/app.config";
import { configureApp } from "../src/bootstrap/configure-app";

describe("MeetingsController", () => {
  let app: INestApplication;
  const hostUserId = "@alice:matrix.nangman.cloud";
  const guestUserId = "@bob:matrix.nangman.cloud";
  const outsiderUserId = "@charlie:matrix.nangman.cloud";
  const futureMeetingStart = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const laterFutureMeetingStart = new Date(
    Date.now() + 48 * 60 * 60 * 1000,
  ).toISOString();

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

  it("creates, lists, starts, updates, and ends meetings", async () => {
    const createResponse = await request(app.getHttpServer())
      .post("/api/v1/meetings")
      .set("x-trace-id", "trace_meeting_flow")
      .set("x-matrix-user-id", hostUserId)
      .send({
        title: "Infra planning",
        description: "Discuss rollout plan",
        hostUserId,
        roomId: "!room:matrix.nangman.cloud",
        joinUrl: "/room/#/infra-planning?roomId=!room:matrix.nangman.cloud",
        startsAt: futureMeetingStart,
        allowJoinBeforeHost: false,
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.headers["x-trace-id"]).toBe("trace_meeting_flow");
    expect(createResponse.headers["x-request-id"]).toEqual(expect.any(String));
    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data.title).toBe("Infra planning");
    expect(createResponse.body.data.status).toBe("scheduled");

    const meetingId = createResponse.body.data.id as string;
    expect(createResponse.body.data.joinUrl).toContain(`meetingId=${meetingId}`);

    const listResponse = await request(app.getHttpServer())
      .get("/api/v1/meetings")
      .set("x-matrix-user-id", hostUserId);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: meetingId,
          title: "Infra planning",
        }),
      ]),
    );

    const startResponse = await request(app.getHttpServer())
      .post(`/api/v1/meetings/${meetingId}/start`)
      .set("x-matrix-user-id", hostUserId);
    expect(startResponse.status).toBe(201);
    expect(startResponse.body.data.status).toBe("live");

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/meetings/${meetingId}`)
      .set("x-matrix-user-id", hostUserId)
      .send({
        title: "Infra planning weekly",
        allowJoinBeforeHost: true,
      });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.title).toBe("Infra planning weekly");
    expect(updateResponse.body.data.allowJoinBeforeHost).toBe(true);

    const endResponse = await request(app.getHttpServer())
      .post(`/api/v1/meetings/${meetingId}/end`)
      .set("x-matrix-user-id", hostUserId);
    expect(endResponse.status).toBe(201);
    expect(endResponse.body.data.status).toBe("ended");

    const getResponse = await request(app.getHttpServer())
      .get(`/api/v1/meetings/${meetingId}`)
      .set("x-matrix-user-id", hostUserId);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data.status).toBe("ended");
  });

  it("rejects scheduled meetings that start in the past", async () => {
    const createResponse = await request(app.getHttpServer())
      .post("/api/v1/meetings")
      .set("x-matrix-user-id", hostUserId)
      .send({
        title: "Past meeting",
        hostUserId,
        roomId: "!past:matrix.nangman.cloud",
        joinUrl: "/room/past",
        startsAt: "2025-01-01T00:00:00.000Z",
      });

    expect(createResponse.status).toBe(400);
    expect(createResponse.body).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: "Scheduled meetings must start in the future.",
        }),
      }),
    );
  });

  it("rejects moving an existing meeting into the past", async () => {
    const createResponse = await request(app.getHttpServer())
      .post("/api/v1/meetings")
      .set("x-matrix-user-id", hostUserId)
      .send({
        title: "Future meeting",
        hostUserId,
        roomId: "!future:matrix.nangman.cloud",
        joinUrl: "/room/future",
        startsAt: laterFutureMeetingStart,
      });

    const meetingId = createResponse.body.data.id as string;

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/meetings/${meetingId}`)
      .set("x-matrix-user-id", hostUserId)
      .send({
        startsAt: "2025-01-01T00:00:00.000Z",
      });

    expect(updateResponse.status).toBe(400);
    expect(updateResponse.body).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: "Scheduled meetings must start in the future.",
        }),
      }),
    );
  });

  it("rejects meeting creation when the actor and host do not match", async () => {
    const createResponse = await request(app.getHttpServer())
      .post("/api/v1/meetings")
      .set("x-matrix-user-id", guestUserId)
      .send({
        title: "Mismatched host",
        hostUserId,
        roomId: "!mismatch:matrix.nangman.cloud",
        joinUrl: "/room/mismatch",
      });

    expect(createResponse.status).toBe(403);
    expect(createResponse.body.error.message).toBe(
      "Only the meeting host can manage this meeting.",
    );
  });

  it("limits meeting management to the host", async () => {
    const createResponse = await request(app.getHttpServer())
      .post("/api/v1/meetings")
      .set("x-matrix-user-id", hostUserId)
      .send({
        title: "Host controls",
        hostUserId,
        roomId: "!host-controls:matrix.nangman.cloud",
        joinUrl: "/room/host-controls",
      });

    const meetingId = createResponse.body.data.id as string;

    const startResponse = await request(app.getHttpServer())
      .post(`/api/v1/meetings/${meetingId}/start`)
      .set("x-matrix-user-id", guestUserId);
    expect(startResponse.status).toBe(403);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/meetings/${meetingId}`)
      .set("x-matrix-user-id", guestUserId)
      .send({ title: "Unauthorized edit" });
    expect(updateResponse.status).toBe(403);

    const endResponse = await request(app.getHttpServer())
      .post(`/api/v1/meetings/${meetingId}/end`)
      .set("x-matrix-user-id", guestUserId);
    expect(endResponse.status).toBe(403);
  });

  it("hides invite-only meetings from unauthorized users", async () => {
    const createResponse = await request(app.getHttpServer())
      .post("/api/v1/meetings")
      .set("x-matrix-user-id", hostUserId)
      .send({
        title: "Invite only",
        hostUserId,
        roomId: "!invite-only:matrix.nangman.cloud",
        joinUrl: "/room/invite-only",
        accessPolicy: "invite_only",
        allowedUserIds: [guestUserId],
      });

    const meetingId = createResponse.body.data.id as string;

    const outsiderListResponse = await request(app.getHttpServer())
      .get("/api/v1/meetings")
      .set("x-matrix-user-id", outsiderUserId);
    expect(outsiderListResponse.status).toBe(200);
    expect(outsiderListResponse.body.data).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: meetingId,
        }),
      ]),
    );

    const guestListResponse = await request(app.getHttpServer())
      .get("/api/v1/meetings")
      .set("x-matrix-user-id", guestUserId);
    expect(guestListResponse.status).toBe(200);
    expect(guestListResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: meetingId,
        }),
      ]),
    );

    const outsiderGetResponse = await request(app.getHttpServer())
      .get(`/api/v1/meetings/${meetingId}`)
      .set("x-matrix-user-id", outsiderUserId);
    expect(outsiderGetResponse.status).toBe(403);
    expect(outsiderGetResponse.body.error.message).toBe(
      "You do not have access to this meeting.",
    );
  });

  it("rejects updates and restarts after a meeting has ended", async () => {
    const createResponse = await request(app.getHttpServer())
      .post("/api/v1/meetings")
      .set("x-matrix-user-id", hostUserId)
      .send({
        title: "Already ended",
        hostUserId,
        roomId: "!ended:matrix.nangman.cloud",
        joinUrl: "/room/ended",
      });

    const meetingId = createResponse.body.data.id as string;

    const endResponse = await request(app.getHttpServer())
      .post(`/api/v1/meetings/${meetingId}/end`)
      .set("x-matrix-user-id", hostUserId);
    expect(endResponse.status).toBe(201);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/meetings/${meetingId}`)
      .set("x-matrix-user-id", hostUserId)
      .send({ title: "Should not save" });
    expect(updateResponse.status).toBe(409);
    expect(updateResponse.body.error.message).toBe(
      "This meeting has already ended.",
    );

    const restartResponse = await request(app.getHttpServer())
      .post(`/api/v1/meetings/${meetingId}/start`)
      .set("x-matrix-user-id", hostUserId);
    expect(restartResponse.status).toBe(409);
    expect(restartResponse.body.error.message).toBe(
      "This meeting has already ended.",
    );
  });
});
