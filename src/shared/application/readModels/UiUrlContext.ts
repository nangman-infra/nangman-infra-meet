/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import { type HeaderStyle, getUrlParams } from "../../../UrlParams.ts";

export interface UiUrlContext {
  lang: string | null;
  fonts: string[];
  fontScale: number | null;
  theme: string | null;
  header: HeaderStyle;
  confineToRoom: boolean;
}

function selectUiUrlContext(
  search = window.location.search,
  hash = window.location.hash,
): UiUrlContext {
  const params = getUrlParams(search, hash);
  return {
    lang: params.lang,
    fonts: params.fonts,
    fontScale: params.fontScale,
    theme: params.theme,
    header: params.header,
    confineToRoom: params.confineToRoom,
  };
}

export function getUiUrlContext(
  search = window.location.search,
  hash = window.location.hash,
): UiUrlContext {
  return selectUiUrlContext(search, hash);
}

export function useUiUrlContext(): UiUrlContext {
  const { search, hash } = useLocation();
  return useMemo(() => selectUiUrlContext(search, hash), [search, hash]);
}
