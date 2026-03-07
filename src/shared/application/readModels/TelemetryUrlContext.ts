/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { getUrlParams } from "../../../UrlParams.ts";

export interface TelemetryUrlContext {
  posthogApiHost: string | null;
  posthogApiKey: string | null;
  posthogUserId: string | null;
  rageshakeSubmitUrl: string | null;
  sentryDsn: string | null;
  sentryEnvironment: string | null;
}

export function getTelemetryUrlContext(
  search = window.location.search,
  hash = window.location.hash,
): TelemetryUrlContext {
  const params = getUrlParams(search, hash);
  return {
    posthogApiHost: params.posthogApiHost,
    posthogApiKey: params.posthogApiKey,
    posthogUserId: params.posthogUserId,
    rageshakeSubmitUrl: params.rageshakeSubmitUrl,
    sentryDsn: params.sentryDsn,
    sentryEnvironment: params.sentryEnvironment,
  };
}
