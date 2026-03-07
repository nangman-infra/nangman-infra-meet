import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { appConfig, AppConfig } from "../src/config/app.config";
import { configureApp } from "../src/bootstrap/configure-app";

describe("MeetingsController", () => {
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

  it("creates, lists, starts, updates, and ends meetings", async () => {
    const createResponse = await request(app.getHttpServer())
      .post("/api/v1/meetings")
      .send({
        title: "Infra planning",
        description: "Discuss rollout plan",
        hostUserId: "@alice:matrix.nangman.cloud",
        roomId: "!room:matrix.nangman.cloud",
        joinUrl: "/room/#/infra-planning?roomId=!room:matrix.nangman.cloud",
        startsAt: "2026-03-08T12:00:00.000Z",
        allowJoinBeforeHost: false,
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data.title).toBe("Infra planning");
    expect(createResponse.body.data.status).toBe("scheduled");

    const meetingId = createResponse.body.data.id as string;

    const listResponse = await request(app.getHttpServer()).get("/api/v1/meetings");
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: meetingId,
          title: "Infra planning",
        }),
      ]),
    );

    const startResponse = await request(app.getHttpServer()).post(
      `/api/v1/meetings/${meetingId}/start`,
    );
    expect(startResponse.status).toBe(201);
    expect(startResponse.body.data.status).toBe("live");

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/meetings/${meetingId}`)
      .send({
        title: "Infra planning weekly",
        allowJoinBeforeHost: true,
      });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.title).toBe("Infra planning weekly");
    expect(updateResponse.body.data.allowJoinBeforeHost).toBe(true);

    const endResponse = await request(app.getHttpServer()).post(
      `/api/v1/meetings/${meetingId}/end`,
    );
    expect(endResponse.status).toBe(201);
    expect(endResponse.body.data.status).toBe("ended");

    const getResponse = await request(app.getHttpServer()).get(
      `/api/v1/meetings/${meetingId}`,
    );
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data.status).toBe("ended");
  });

  it("rejects scheduled meetings that start in the past", async () => {
    const createResponse = await request(app.getHttpServer())
      .post("/api/v1/meetings")
      .send({
        title: "Past meeting",
        hostUserId: "@alice:matrix.nangman.cloud",
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
      .send({
        title: "Future meeting",
        hostUserId: "@alice:matrix.nangman.cloud",
        roomId: "!future:matrix.nangman.cloud",
        joinUrl: "/room/future",
        startsAt: "2027-03-08T12:00:00.000Z",
      });

    const meetingId = createResponse.body.data.id as string;

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/meetings/${meetingId}`)
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
});
