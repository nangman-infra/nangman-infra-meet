/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type LivekitTransport } from "matrix-js-sdk/lib/matrixrtc";

import { type CallTransport } from "../domain/CallTransport.ts";

export function toLivekitTransport(transport: CallTransport): LivekitTransport {
  return {
    type: "livekit",
    livekit_service_url: transport.serviceUrl,
    livekit_alias: transport.roomAlias,
  };
}

export function fromLivekitTransport(
  transport: LivekitTransport,
): CallTransport {
  return {
    kind: "livekit",
    serviceUrl: transport.livekit_service_url,
    roomAlias: transport.livekit_alias,
  };
}
