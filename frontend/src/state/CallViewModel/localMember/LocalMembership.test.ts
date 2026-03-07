/*
Copyright 2025 Element Creations Ltd.
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { describe, expect, it, vi } from "vitest";
import { AutoDiscovery } from "matrix-js-sdk/lib/autodiscovery";
import { map } from "rxjs";
import { logger } from "matrix-js-sdk/lib/logger";

import { MatrixRTCMode } from "../../../settings/settings";
import {
  mockConfig,
  mockMuteStates,
  withTestScheduler,
} from "../../../utils/test";
import {
  createLocalMembership$,
  enterRTCSession,
  LivekitState,
} from "./LocalMembership";
import { MatrixRTCTransportMissingError } from "../../../utils/errors";
import { Epoch } from "../../ObservableScope";
import { constant } from "../../Behavior";
import { ConnectionManagerData } from "../remoteMembers/ConnectionManager";
import { type Publisher } from "./Publisher";
import { type CallTransport } from "../../../domains/call/domain/CallTransport";
import {
  type CallSessionMembershipPort,
  type JoinableCallSessionPort,
} from "../../../domains/call/application/ports/CallSessionPort.ts";

const MATRIX_RTC_MODE = MatrixRTCMode.Legacy;
const getCallUrlContext = vi.hoisted(() => vi.fn(() => ({})));
const getMediaUrlContext = vi.hoisted(() => vi.fn(() => ({})));
vi.mock(
  "../../../domains/call/application/readModels/CallUrlContext.ts",
  () => ({
    getCallUrlContext,
  }),
);
vi.mock(
  "../../../domains/media/application/readModels/MediaUrlContext.ts",
  () => ({
    getMediaUrlContext,
  }),
);

describe("LocalMembership", () => {
  describe("enterRTCSession", () => {
    it("It joins the correct Session", async () => {
      const focusFromOlderMembership = {
        type: "livekit",
        livekit_service_url: "http://my-oldest-member-service-url.com",
        livekit_alias: "my-oldest-member-service-alias",
      };

      const focusConfigFromWellKnown = {
        type: "livekit",
        livekit_service_url: "http://my-well-known-service-url.com",
      };
      const focusConfigFromWellKnown2 = {
        type: "livekit",
        livekit_service_url: "http://my-well-known-service-url2.com",
      };
      const clientWellKnown = {
        "org.matrix.msc4143.rtc_foci": [
          focusConfigFromWellKnown,
          focusConfigFromWellKnown2,
        ],
      };

      mockConfig({
        livekit: { livekit_service_url: "http://my-default-service-url.com" },
      });

      vi.spyOn(AutoDiscovery, "getRawClientConfig").mockImplementation(
        async (domain) => {
          if (domain === "example.org") {
            return Promise.resolve(clientWellKnown);
          }
          return Promise.resolve({});
        },
      );

      const mockedSession = vi.mocked({
        room: {
          roomId: "roomId",
          client: {
            getDomain: vi.fn().mockReturnValue("example.org"),
            getOpenIdToken: vi.fn().mockResolvedValue({
              access_token: "ACCCESS_TOKEN",
              token_type: "Bearer",
              matrix_server_name: "localhost",
              expires_in: 10000,
            }),
          },
        },
        memberships: [],
        getFocusInUse: vi.fn().mockReturnValue(focusFromOlderMembership),
        getOldestMembership: vi.fn().mockReturnValue({
          getPreferredFoci: vi.fn().mockReturnValue([focusFromOlderMembership]),
        }),
        joinRoomSession: vi.fn(),
      }) as unknown as JoinableCallSessionPort;

      await enterRTCSession(
        mockedSession,
        {
          livekit_alias: "roomId",
          livekit_service_url: "http://my-well-known-service-url.com",
          type: "livekit",
        },
        {
          encryptMedia: true,
          matrixRTCMode: MATRIX_RTC_MODE,
        },
      );

      expect(mockedSession.joinRoomSession).toHaveBeenLastCalledWith(
        [
          {
            livekit_alias: "roomId",
            livekit_service_url: "http://my-well-known-service-url.com",
            type: "livekit",
          },
        ],
        undefined,
        expect.objectContaining({
          manageMediaKeys: true,
          useLegacyMemberEvents: false,
        }),
      );
    });

    it("It should not fail with configuration error if homeserver config has livekit url but not fallback", async () => {
      mockConfig({});
      vi.spyOn(AutoDiscovery, "getRawClientConfig").mockResolvedValue({
        "org.matrix.msc4143.rtc_foci": [
          {
            type: "livekit",
            livekit_service_url: "http://my-well-known-service-url.com",
          },
        ],
      });

      const mockedSession = vi.mocked({
        room: {
          roomId: "roomId",
          client: {
            getDomain: vi.fn().mockReturnValue("example.org"),
            getOpenIdToken: vi.fn().mockResolvedValue({
              access_token: "ACCCESS_TOKEN",
              token_type: "Bearer",
              matrix_server_name: "localhost",
              expires_in: 10000,
            }),
          },
        },
        memberships: [],
        getFocusInUse: vi.fn(),
        joinRoomSession: vi.fn(),
      }) as unknown as JoinableCallSessionPort;

      await enterRTCSession(
        mockedSession,
        {
          livekit_alias: "roomId",
          livekit_service_url: "http://my-well-known-service-url.com",
          type: "livekit",
        },
        {
          encryptMedia: true,
          matrixRTCMode: MATRIX_RTC_MODE,
        },
      );
    });
  });

  const defaultCreateLocalMemberValues = {
    options: constant({
      encryptMedia: false,
      matrixRTCMode: MatrixRTCMode.Matrix_2_0,
    }),
    matrixRTCSession: {
      updateCallIntent: () => {},
      leaveRoomSession: () => {},
    } as unknown as CallSessionMembershipPort,
    muteStates: mockMuteStates(),
    isHomeserverConnected: constant(true),
    trackProcessorState$: constant({
      supported: false,
      processor: undefined,
    }),
    logger: logger,
    createPublisherFactory: (): Publisher => ({}) as unknown as Publisher,
    joinMatrixRTC: async (): Promise<void> => {},
    homeserverConnected$: constant(true),
  };

  it("throws error on missing RTC config error", () => {
    withTestScheduler(({ scope, hot, expectObservable }) => {
      const goodTransport = {
        kind: "livekit",
        serviceUrl: "other",
        roomAlias: "!room:example.org",
      } as CallTransport;

      const localTransport$ = scope.behavior<CallTransport>(
        hot("1ms #", {}, new MatrixRTCTransportMissingError("domain.com")),
        goodTransport,
      );

      const mockConnectionManager = {
        transports$: scope.behavior(
          localTransport$.pipe(map((t) => new Epoch([t]))),
        ),
        connectionManagerData$: constant(
          new Epoch(new ConnectionManagerData()),
        ),
      };

      const localMembership = createLocalMembership$({
        scope,
        ...defaultCreateLocalMemberValues,
        connectionManager: mockConnectionManager,
        localTransport$,
      });

      expectObservable(localMembership.connectionState.livekit$).toBe("ne", {
        n: { state: LivekitState.Uninitialized },
        e: {
          state: LivekitState.Error,
          error: expect.toSatisfy(
            (e) => e instanceof MatrixRTCTransportMissingError,
          ),
        },
      });
    });
  });
});
