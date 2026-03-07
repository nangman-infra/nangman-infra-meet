/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type CallTransport } from "../../domain/CallTransport.ts";
import { type DiscoveredCallTransports } from "../ports/CallTransportDiscoveryPort.ts";

export function selectPreferredCallTransport(
  discovered: DiscoveredCallTransports,
): CallTransport | null {
  return (
    discovered.developerOverride ??
    discovered.wellKnown ??
    discovered.configuredFallback ??
    null
  );
}
