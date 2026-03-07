import { INestApplication } from "@nestjs/common";
import { appConfig, AppConfig } from "../src/config/app.config";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/bootstrap/configure-app";

describe("HealthController", () => {
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

  it("returns versioned health response", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          service: "nangman-infra-meet-backend",
          status: "ok",
        }),
        error: null,
      }),
    );
  });

  it("returns internal health response for container checks", async () => {
    const response = await request(app.getHttpServer()).get("/internal/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          service: "nangman-infra-meet-backend",
          status: "ok",
        }),
        error: null,
      }),
    );
  });
});
