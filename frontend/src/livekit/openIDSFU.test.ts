/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { afterEach, describe, expect, it, vi } from "vitest";

import { getSFUConfigWithOpenID } from "./openIDSFU";

describe("getSFUConfigWithOpenID", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps tracing local and sends only the SFU request body", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            url: "wss://matrix-rtc.example.org/livekit/sfu",
            jwt: "ATOKEN",
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
              "x-request-id": "server_req_123",
              "x-trace-id": "server_trace_123",
            },
          },
        ),
      );

    await expect(
      getSFUConfigWithOpenID(
        {
          getOpenIdToken: vi.fn().mockResolvedValue({
            access_token: "token",
            token_type: "Bearer",
            matrix_server_name: "example.org",
            expires_in: 3600,
          }),
          getDeviceId: vi.fn().mockReturnValue("ABCDEF"),
          getUserId: vi.fn().mockReturnValue("@alice:example.org"),
        },
        "https://matrix-rtc.example.org/livekit/jwt",
        "!room:example.org",
      ),
    ).resolves.toEqual({
      url: "wss://matrix-rtc.example.org/livekit/sfu",
      jwt: "ATOKEN",
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://matrix-rtc.example.org/livekit/jwt/sfu/get",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );

    const headers = fetchSpy.mock.calls[0]?.[1]?.headers;
    expect(headers).toEqual(
      expect.objectContaining({
        "Content-Type": "application/json",
      }),
    );
    expect((headers as Record<string, string>)["x-request-id"]).toBeUndefined();
    expect((headers as Record<string, string>)["x-trace-id"]).toBeUndefined();
    expect((headers as Record<string, string>)["x-matrix-user-id"]).toBeUndefined();
  });
});
