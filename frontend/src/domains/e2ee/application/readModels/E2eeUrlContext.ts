/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { getUrlParams } from "../../../../UrlParams.ts";

export interface E2eeUrlContext {
  roomId: string | null;
  password: string | null;
  e2eEnabled: boolean;
}

export function getE2eeUrlContext(
  search = window.location.search,
  hash = window.location.hash,
): E2eeUrlContext {
  const params = getUrlParams(search, hash);
  return {
    roomId: params.roomId,
    password: params.password,
    e2eEnabled: params.e2eEnabled,
  };
}
