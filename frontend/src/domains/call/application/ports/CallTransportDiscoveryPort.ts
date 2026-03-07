/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type CallTransport } from "../../domain/CallTransport.ts";

export interface CallTransportDiscoveryRequest {
  roomId: string;
  customLivekitServiceUrl: string | null;
}

export interface DiscoveredCallTransports {
  developerOverride?: CallTransport;
  wellKnown?: CallTransport;
  configuredFallback?: CallTransport;
}

export interface CallTransportDiscoveryPort {
  discover(
    request: CallTransportDiscoveryRequest,
  ): Promise<DiscoveredCallTransports>;
}
