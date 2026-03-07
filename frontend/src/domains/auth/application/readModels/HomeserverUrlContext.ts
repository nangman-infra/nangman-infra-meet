/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { getUrlParams } from "../../../../UrlParams.ts";

export interface HomeserverUrlContext {
  homeserver: string | null;
}

export function getHomeserverUrlContext(
  search = window.location.search,
  hash = window.location.hash,
): HomeserverUrlContext {
  const params = getUrlParams(search, hash);
  return {
    homeserver: params.homeserver,
  };
}
