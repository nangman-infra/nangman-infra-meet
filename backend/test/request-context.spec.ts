import {
  extractUserIdFromRequest,
  extractTestRunIdFromRequest,
  getRequestContext,
  MATRIX_USER_ID_HEADER,
  REQUEST_ID_HEADER,
  requestContextMiddleware,
  TEST_RUN_ID_HEADER,
  TRACE_ID_HEADER,
} from "../src/common/request-context/request-context";

describe("request context", () => {
  it("prefers the explicit matrix user id header", () => {
    const header = (name: string): string | undefined =>
      ({
        [MATRIX_USER_ID_HEADER]: "@alice:example.org",
        "x-forwarded-user": "proxy-user",
      })[name.toLowerCase()];

    expect(extractUserIdFromRequest({ header })).toBe("@alice:example.org");
  });

  it("falls back to common proxy user headers", () => {
    const header = (name: string): string | undefined =>
      ({
        "x-forwarded-user": "proxy-user",
      })[name.toLowerCase()];

    expect(extractUserIdFromRequest({ header })).toBe("proxy-user");
  });

  it("extracts the optional test run id header", () => {
    const header = (name: string): string | undefined =>
      ({
        [TEST_RUN_ID_HEADER]: "backend-e2e",
      })[name.toLowerCase()];

    expect(extractTestRunIdFromRequest({ header })).toBe("backend-e2e");
  });

  it("echoes request and trace ids back to the client", () => {
    const setHeader = jest.fn();
    const next = jest.fn();

    requestContextMiddleware(
      {
        header: (name: string): string | undefined =>
          ({
            [REQUEST_ID_HEADER]: "req_existing",
            [TRACE_ID_HEADER]: "trace_existing",
          })[name.toLowerCase()],
      } as never,
      { setHeader } as never,
      next,
    );

    expect(setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, "req_existing");
    expect(setHeader).toHaveBeenCalledWith(TRACE_ID_HEADER, "trace_existing");
    expect(next).toHaveBeenCalled();
  });

  it("stores the test run id in request context", () => {
    const next = jest.fn(() => {
      expect(getRequestContext()).toEqual(
        expect.objectContaining({
          testRunId: "backend-e2e",
        }),
      );
    });

    requestContextMiddleware(
      {
        header: (name: string): string | undefined =>
          ({
            [TEST_RUN_ID_HEADER]: "backend-e2e",
          })[name.toLowerCase()],
      } as never,
      { setHeader: jest.fn() } as never,
      next,
    );

    expect(next).toHaveBeenCalled();
  });
});
