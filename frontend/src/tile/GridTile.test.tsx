/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type RemoteTrackPublication } from "livekit-client";
import { test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { type MatrixRTCSession } from "matrix-js-sdk/lib/matrixrtc";

import { GridTile } from "./GridTile";
import { mockRtcMembership, createRemoteMedia } from "../utils/test";
import { GridTileViewModel } from "../state/TileViewModel";
import { ReactionsSenderProvider } from "../reactions/useReactionsSender";
import type { CallViewModel } from "../state/CallViewModel/CallViewModel";
import { constant } from "../state/Behavior";
import { type CallSessionViewPort } from "../domains/call/application/ports/CallSessionViewPort.ts";

global.IntersectionObserver = class MockIntersectionObserver {
  public observe(): void {}
  public unobserve(): void {}
  public disconnect(): void {}
} as unknown as typeof IntersectionObserver;

test("GridTile is accessible", async () => {
  const vm = createRemoteMedia(
    mockRtcMembership("@alice:example.org", "AAAA"),
    {
      rawDisplayName: "Alice",
      getMxcAvatarUrl: () => "mxc://adfsg",
    },
    {
      setVolume() {},
      getTrackPublication: () =>
        ({}) as Partial<RemoteTrackPublication> as RemoteTrackPublication,
    },
  );

  const fakeRoom = {
    roomId: "!test:example.org",
    on: (): void => {},
    off: (): void => {},
    client: {
      getUserId: () => null,
      getDeviceId: () => null,
      on: (): void => {},
      off: (): void => {},
      sendEvent: vi.fn().mockResolvedValue({ event_id: "$test:example.org" }),
      redactEvent: vi.fn().mockResolvedValue({ event_id: "$test:example.org" }),
    },
  } as unknown as MatrixRTCSession["room"];
  const emptyMemberships: never[] = [];
  const fakeCallSession = {
    roomId: fakeRoom.roomId,
    getCallMemberSessions: (): never[] => emptyMemberships,
    getCallSessionStats: (): {
      roomEventEncryptionKeysSent: number;
      roomEventEncryptionKeysReceived: number;
      roomEventEncryptionKeysReceivedAverageAge: number;
    } => ({
      roomEventEncryptionKeysSent: 0,
      roomEventEncryptionKeysReceived: 0,
      roomEventEncryptionKeysReceivedAverageAge: 0,
    }),
    isJoined: (): boolean => false,
    subscribeToMembershipsChanged: (): (() => void) => (): void => {},
    subscribeToMembershipManagerError: (): (() => void) => (): void => {},
  } satisfies CallSessionViewPort;
  const cVm = {
    reactions$: constant({}),
    handsRaised$: constant({}),
  } as Partial<CallViewModel> as CallViewModel;
  const { container } = render(
    <ReactionsSenderProvider
      vm={cVm}
      callSession={fakeCallSession}
      matrixRoom={fakeRoom}
    >
      <GridTile
        vm={new GridTileViewModel(constant(vm))}
        onOpenProfile={() => {}}
        targetWidth={300}
        targetHeight={200}
        showSpeakingIndicators
        focusable={true}
      />
    </ReactionsSenderProvider>,
  );
  expect(await axe(container)).toHaveNoViolations();
  // Name should be visible
  screen.getByText("Alice");
});
