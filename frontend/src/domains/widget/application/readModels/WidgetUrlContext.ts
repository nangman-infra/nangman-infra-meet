/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { getUrlParams } from "../../../../UrlParams.ts";

export interface WidgetUrlContext {
  widgetId: string | null;
  parentUrl: string | null;
  roomId: string | null;
  userId: string | null;
  deviceId: string | null;
  baseUrl: string | null;
  e2eEnabled: boolean;
  allowIceFallback: boolean;
  preload: boolean;
  skipLobby: boolean;
  returnToLobby: boolean;
  widgetMode: boolean;
}

function selectWidgetUrlContext(
  search = window.location.search,
  hash = window.location.hash,
): WidgetUrlContext {
  const params = getUrlParams(search, hash);
  return {
    widgetId: params.widgetId,
    parentUrl: params.parentUrl,
    roomId: params.roomId,
    userId: params.userId,
    deviceId: params.deviceId,
    baseUrl: params.baseUrl,
    e2eEnabled: params.e2eEnabled,
    allowIceFallback: params.allowIceFallback,
    preload: params.preload,
    skipLobby: params.skipLobby,
    returnToLobby: params.returnToLobby,
    widgetMode: !!params.widgetId && !!params.parentUrl,
  };
}

export function getWidgetUrlContext(
  search = window.location.search,
  hash = window.location.hash,
): WidgetUrlContext {
  return selectWidgetUrlContext(search, hash);
}
