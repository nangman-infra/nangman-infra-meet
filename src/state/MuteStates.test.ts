/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import EventEmitter from "events";
import { waitFor } from "@testing-library/react";
import { of } from "rxjs";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { MediaDevices } from "./MediaDevices.ts";
import { MuteStates } from "./MuteStates.ts";
import { ObservableScope } from "./ObservableScope.ts";
import { ElementWidgetActions, type WidgetHostPort } from "../domains/widget/application/ports/WidgetHostPort.ts";
import { registerWidgetHost, resetWidgetHost } from "../domains/widget/application/services/WidgetHostService.ts";

function createMediaDevices(): MediaDevices {
  return {
    audioInput: {
      available$: of(new Map([["default", "Default microphone"]])),
      selected$: of("default"),
      select: vi.fn(),
    },
    audioOutput: {
      available$: of(new Map()),
      selected$: of(undefined),
      select: vi.fn(),
    },
    videoInput: {
      available$: of(new Map([["default", "Default camera"]])),
      selected$: of("default"),
      select: vi.fn(),
    },
  } as unknown as MediaDevices;
}

describe("MuteStates", () => {
  let send: ReturnType<typeof vi.fn>;
  let reply: ReturnType<typeof vi.fn>;
  let lazyActions: EventEmitter;

  beforeEach(() => {
    send = vi.fn().mockResolvedValue(undefined);
    reply = vi.fn();
    lazyActions = new EventEmitter();

    registerWidgetHost({
      api: {
        transport: {
          send,
          reply,
          stop: vi.fn(),
        },
        hasCapability: vi.fn(),
        sendContentLoaded: vi.fn(),
        setAlwaysOnScreen: vi.fn(),
      },
      lazyActions,
      client: Promise.resolve({}),
    } as unknown as WidgetHostPort);
  });

  afterEach(() => {
    resetWidgetHost();
  });

  test("syncs local mute changes to the widget host", async () => {
    const muteStates = new MuteStates(
      new ObservableScope(),
      createMediaDevices(),
      of(true),
    );

    muteStates.audio.setEnabled$.value?.(true);
    muteStates.video.setEnabled$.value?.(true);

    await waitFor(() =>
      expect(send).toHaveBeenLastCalledWith(
        ElementWidgetActions.DeviceMute,
        {
          audio_enabled: true,
          video_enabled: true,
        },
      ),
    );
  });

  test("applies widget mute changes and replies with the merged state", async () => {
    const muteStates = new MuteStates(
      new ObservableScope(),
      createMediaDevices(),
      of(true),
    );
    const request = {
      data: { audio_enabled: true },
    };

    lazyActions.emit(
      ElementWidgetActions.DeviceMute,
      new CustomEvent(ElementWidgetActions.DeviceMute, {
        detail: request,
      }),
    );

    await waitFor(() => expect(muteStates.audio.enabled$.value).toBe(true));
    expect(muteStates.video.enabled$.value).toBe(false);
    expect(reply).toHaveBeenCalledWith(request, {
      audio_enabled: true,
      video_enabled: false,
    });
  });
});
