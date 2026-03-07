/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import { type HeaderStyle, getUrlParams } from "../../../../UrlParams.ts";

export interface RoomEntryUrlContext {
  confineToRoom: boolean;
  appPrompt: boolean;
  preload: boolean;
  header: HeaderStyle;
  skipLobby: boolean;
}

function selectRoomEntryUrlContext(
  search = window.location.search,
  hash = window.location.hash,
): RoomEntryUrlContext {
  const params = getUrlParams(search, hash);
  return {
    confineToRoom: params.confineToRoom,
    appPrompt: params.appPrompt,
    preload: params.preload,
    header: params.header,
    skipLobby: params.skipLobby,
  };
}

export function getRoomEntryUrlContext(
  search = window.location.search,
  hash = window.location.hash,
): RoomEntryUrlContext {
  return selectRoomEntryUrlContext(search, hash);
}

export function useRoomEntryUrlContext(): RoomEntryUrlContext {
  const { search, hash } = useLocation();
  return useMemo(() => selectRoomEntryUrlContext(search, hash), [search, hash]);
}
