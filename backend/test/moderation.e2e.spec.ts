import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { appConfig, AppConfig } from "../src/config/app.config";
import { configureApp } from "../src/bootstrap/configure-app";

describe("ModerationController", () => {
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

  it("gates host approval meetings until the host approves access", async () => {
    const createMeetingResponse = await request(app.getHttpServer())
      .post("/api/v1/meetings")
      .set("x-matrix-user-id", "@host:matrix.nangman.cloud")
      .send({
        title: "Ops review",
        hostUserId: "@host:matrix.nangman.cloud",
        roomId: "!ops:matrix.nangman.cloud",
        joinUrl: "/room/ops-review",
        accessPolicy: "host_approval",
        allowJoinBeforeHost: true,
      });

    const meetingId = createMeetingResponse.body.data.id as string;

    const initialDecision = await request(app.getHttpServer())
      .get(`/api/v1/meetings/${meetingId}/entry-access`)
      .set("x-matrix-user-id", "@guest:matrix.nangman.cloud");

    expect(initialDecision.status).toBe(200);
    expect(initialDecision.body.data.kind).toBe("request_access");

    const requestResponse = await request(app.getHttpServer())
      .post(`/api/v1/meetings/${meetingId}/access-requests`)
      .set("x-matrix-user-id", "@guest:matrix.nangman.cloud");

    expect(requestResponse.status).toBe(201);
    const requestId = requestResponse.body.data.id as string;

    const pendingDecision = await request(app.getHttpServer())
      .get(`/api/v1/meetings/${meetingId}/entry-access`)
      .set("x-matrix-user-id", "@guest:matrix.nangman.cloud");

    expect(pendingDecision.body.data.kind).toBe("pending_approval");

    const listResponse = await request(app.getHttpServer())
      .get(`/api/v1/meetings/${meetingId}/access-requests`)
      .set("x-matrix-user-id", "@host:matrix.nangman.cloud");

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: requestId,
          userId: "@guest:matrix.nangman.cloud",
          status: "pending",
        }),
      ]),
    );

    const approveResponse = await request(app.getHttpServer())
      .post(`/api/v1/meetings/${meetingId}/access-requests/${requestId}/approve`)
      .set("x-matrix-user-id", "@host:matrix.nangman.cloud");

    expect(approveResponse.status).toBe(201);
    expect(approveResponse.body.data.status).toBe("approved");

    const approvedDecision = await request(app.getHttpServer())
      .get(`/api/v1/meetings/${meetingId}/entry-access`)
      .set("x-matrix-user-id", "@guest:matrix.nangman.cloud");

    expect(approvedDecision.body.data.kind).toBe("allow");
  });

  it("blocks invite only meetings for users outside the allow list", async () => {
    const createMeetingResponse = await request(app.getHttpServer())
      .post("/api/v1/meetings")
      .set("x-matrix-user-id", "@host:matrix.nangman.cloud")
      .send({
        title: "Leads sync",
        hostUserId: "@host:matrix.nangman.cloud",
        roomId: "!leads:matrix.nangman.cloud",
        joinUrl: "/room/leads-sync",
        accessPolicy: "invite_only",
        allowedUserIds: ["@alice:matrix.nangman.cloud"],
      });

    const meetingId = createMeetingResponse.body.data.id as string;

    const invitedDecision = await request(app.getHttpServer())
      .get(`/api/v1/meetings/${meetingId}/entry-access`)
      .set("x-matrix-user-id", "@alice:matrix.nangman.cloud");

    expect(invitedDecision.body.data.kind).toBe("allow");

    const blockedDecision = await request(app.getHttpServer())
      .get(`/api/v1/meetings/${meetingId}/entry-access`)
      .set("x-matrix-user-id", "@bob:matrix.nangman.cloud");

    expect(blockedDecision.body.data.kind).toBe("not_invited");
  });

  it("waits for the host when join-before-host is disabled", async () => {
    const futureMeetingStart = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    ).toISOString();
    const createMeetingResponse = await request(app.getHttpServer())
      .post("/api/v1/meetings")
      .set("x-matrix-user-id", "@host:matrix.nangman.cloud")
      .send({
        title: "Weekly sync",
        hostUserId: "@host:matrix.nangman.cloud",
        roomId: "!weekly:matrix.nangman.cloud",
        joinUrl: "/room/weekly-sync",
        startsAt: futureMeetingStart,
        allowJoinBeforeHost: false,
        accessPolicy: "open",
      });

    const meetingId = createMeetingResponse.body.data.id as string;

    const beforeStartDecision = await request(app.getHttpServer())
      .get(`/api/v1/meetings/${meetingId}/entry-access`)
      .set("x-matrix-user-id", "@guest:matrix.nangman.cloud");

    expect(beforeStartDecision.body.data.kind).toBe("wait_for_host");

    await request(app.getHttpServer())
      .post(`/api/v1/meetings/${meetingId}/start`)
      .set("x-matrix-user-id", "@host:matrix.nangman.cloud");

    const afterStartDecision = await request(app.getHttpServer())
      .get(`/api/v1/meetings/${meetingId}/entry-access`)
      .set("x-matrix-user-id", "@guest:matrix.nangman.cloud");

    expect(afterStartDecision.body.data.kind).toBe("allow");
  });
});
