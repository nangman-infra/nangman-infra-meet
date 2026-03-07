/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { logger } from "matrix-js-sdk/lib/logger";
import { combineLatest, withLatestFrom } from "rxjs";

import type { ObservableScope } from "../../../../state/ObservableScope.ts";
import { ElementWidgetActions } from "../ports/WidgetHostPort.ts";
import type {
  WidgetDeviceMuteState,
  WidgetMuteStatePort,
} from "../ports/WidgetMuteStatePort.ts";
import {
  observeWidgetAction$,
  replyToWidgetAction,
  sendWidgetAction,
} from "./WidgetActionService.ts";
import { hasWidgetHost } from "./WidgetHostService.ts";

export function bindWidgetMuteState(
  scope: ObservableScope,
  muteState: WidgetMuteStatePort,
): void {
  if (!hasWidgetHost()) return;

  const widgetApiState$ = combineLatest(
    [muteState.audioEnabled$, muteState.videoEnabled$],
    (audio, video): WidgetDeviceMuteState => ({
      audio_enabled: audio,
      video_enabled: video,
    }),
  );

  widgetApiState$.pipe(scope.bind()).subscribe((state) => {
    sendWidgetAction(ElementWidgetActions.DeviceMute, state).catch((e) =>
      logger.warn("Could not send DeviceMute action to widget", e),
    );
  });

  observeWidgetAction$(ElementWidgetActions.DeviceMute)
    .pipe(
      withLatestFrom(
        widgetApiState$,
        muteState.audioSetEnabled$,
        muteState.videoSetEnabled$,
      ),
      scope.bind(),
    )
    .subscribe(([ev, state, setAudioEnabled, setVideoEnabled]) => {
      const newState = { ...state };

      if (
        ev.detail.data.audio_enabled != null &&
        typeof ev.detail.data.audio_enabled === "boolean" &&
        setAudioEnabled !== null
      ) {
        newState.audio_enabled = ev.detail.data.audio_enabled;
        setAudioEnabled(newState.audio_enabled);
      }

      if (
        ev.detail.data.video_enabled != null &&
        typeof ev.detail.data.video_enabled === "boolean" &&
        setVideoEnabled !== null
      ) {
        newState.video_enabled = ev.detail.data.video_enabled;
        setVideoEnabled(newState.video_enabled);
      }

      replyToWidgetAction(ev.detail, newState);
    });
}
