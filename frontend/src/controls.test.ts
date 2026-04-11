/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { beforeEach, describe, expect, it, vi } from "vitest";

describe("controls helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    window.controls = {
      ...window.controls,
      onAudioPlaybackStarted: vi.fn(),
    };
  });

  it("notifies both modern and legacy audio device handlers", async () => {
    const { emitNativeAudioDeviceSelection } = await import("./controls");
    const onAudioDeviceSelect = vi.fn();
    const onOutputDeviceSelect = vi.fn();

    emitNativeAudioDeviceSelection(
      {
        ...window.controls,
        onAudioDeviceSelect,
        onOutputDeviceSelect,
      },
      "speaker",
    );

    expect(onAudioDeviceSelect).toHaveBeenCalledWith("speaker");
    expect(onOutputDeviceSelect).toHaveBeenCalledWith("speaker");
  });

  it("opens both modern and legacy native pickers", async () => {
    const { openNativeAudioDevicePicker } = await import("./controls");
    const showNativeAudioDevicePicker = vi.fn();
    const showNativeOutputDevicePicker = vi.fn();

    openNativeAudioDevicePicker({
      ...window.controls,
      showNativeAudioDevicePicker,
      showNativeOutputDevicePicker,
    });

    expect(showNativeAudioDevicePicker).toHaveBeenCalledOnce();
    expect(showNativeOutputDevicePicker).toHaveBeenCalledOnce();
  });

  it("emits playback started only once", async () => {
    const { setPlaybackStarted } = await import("./controls");
    window.controls.onAudioPlaybackStarted = vi.fn();
    setPlaybackStarted();
    setPlaybackStarted();

    expect(window.controls.onAudioPlaybackStarted).toHaveBeenCalledTimes(1);
  });
});
