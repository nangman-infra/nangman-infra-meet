import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { TEST_RUN_ID_HEADER } from "../src/common/request-context/request-context";

const BACKEND_E2E_TEST_RUN_ID = "backend-e2e";

export function testRequest(app: INestApplication) {
  const server = app.getHttpServer();

  return {
    delete: (path: string) =>
      request(server)
        .delete(path)
        .set(TEST_RUN_ID_HEADER, BACKEND_E2E_TEST_RUN_ID),
    get: (path: string) =>
      request(server)
        .get(path)
        .set(TEST_RUN_ID_HEADER, BACKEND_E2E_TEST_RUN_ID),
    patch: (path: string) =>
      request(server)
        .patch(path)
        .set(TEST_RUN_ID_HEADER, BACKEND_E2E_TEST_RUN_ID),
    post: (path: string) =>
      request(server)
        .post(path)
        .set(TEST_RUN_ID_HEADER, BACKEND_E2E_TEST_RUN_ID),
    put: (path: string) =>
      request(server)
        .put(path)
        .set(TEST_RUN_ID_HEADER, BACKEND_E2E_TEST_RUN_ID),
  };
}
