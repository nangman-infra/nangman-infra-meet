/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import { getUrlParams } from "../../../../UrlParams.ts";

export interface MediaUrlContext {
  controlledAudioDevices: boolean;
  hideScreensharing: boolean;
  skipLobby: boolean;
}

function selectMediaUrlContext(
  search = window.location.search,
  hash = window.location.hash,
): MediaUrlContext {
  const params = getUrlParams(search, hash);
  return {
    controlledAudioDevices: params.controlledAudioDevices,
    hideScreensharing: params.hideScreensharing,
    skipLobby: params.skipLobby,
  };
}

export function getMediaUrlContext(
  search = window.location.search,
  hash = window.location.hash,
): MediaUrlContext {
  return selectMediaUrlContext(search, hash);
}

export function useMediaUrlContext(): MediaUrlContext {
  const { search, hash } = useLocation();
  return useMemo(() => selectMediaUrlContext(search, hash), [search, hash]);
}
