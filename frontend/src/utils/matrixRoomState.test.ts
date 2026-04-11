/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { describe, expect, it, vi } from "vitest";
import { EventTimeline } from "matrix-js-sdk";

import { getCurrentRoomState, getCurrentStateEvent } from "./matrixRoomState";

describe("matrixRoomState", () => {
  it("prefers the live timeline state when available", () => {
    const liveRoomState = { getStateEvents: vi.fn() };
    const room = {
      getLiveTimeline: vi.fn().mockReturnValue({
        getState: vi.fn().mockReturnValue(liveRoomState),
      }),
      currentState: { getStateEvents: vi.fn() },
    };

    expect(getCurrentRoomState(room as never)).toBe(liveRoomState);
    expect(room.getLiveTimeline).toHaveBeenCalledOnce();
    expect(room.getLiveTimeline().getState).toHaveBeenCalledWith(
      EventTimeline.FORWARDS,
    );
  });

  it("falls back to the legacy currentState when no live timeline is available", () => {
    const legacyRoomState = { getStateEvents: vi.fn() };
    const room = {
      getLiveTimeline: vi.fn().mockReturnValue(null),
      currentState: legacyRoomState,
    };

    expect(getCurrentRoomState(room as never)).toBe(legacyRoomState);
  });

  it("uses the legacy state when the live state lacks getStateEvents", () => {
    const event = { getId: vi.fn().mockReturnValue("$event") };
    const room = {
      getLiveTimeline: vi.fn().mockReturnValue({
        getState: vi.fn().mockReturnValue({}),
      }),
      currentState: {
        getStateEvents: vi.fn().mockReturnValue(event),
      },
    };

    expect(getCurrentStateEvent(room as never, "m.room.topic")).toBe(event as never);
    expect(room.currentState.getStateEvents).toHaveBeenCalledWith(
      "m.room.topic",
      "",
    );
  });

  it("returns null when state events come back as an array", () => {
    const room = {
      getLiveTimeline: vi.fn().mockReturnValue({
        getState: vi.fn().mockReturnValue({
          getStateEvents: vi.fn().mockReturnValue([
            { getId: (): string => "$event" },
          ]),
        }),
      }),
    };

    expect(getCurrentStateEvent(room as never, "m.room.name")).toBeNull();
  });
});
