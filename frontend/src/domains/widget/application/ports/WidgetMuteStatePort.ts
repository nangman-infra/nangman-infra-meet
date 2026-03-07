/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import type { Observable } from "rxjs";

export interface WidgetDeviceMuteState extends Record<string, unknown> {
  audio_enabled: boolean;
  video_enabled: boolean;
}

export interface WidgetMuteStatePort {
  readonly audioEnabled$: Observable<boolean>;
  readonly videoEnabled$: Observable<boolean>;
  readonly audioSetEnabled$: Observable<((enabled: boolean) => void) | null>;
  readonly videoSetEnabled$: Observable<((enabled: boolean) => void) | null>;
}
