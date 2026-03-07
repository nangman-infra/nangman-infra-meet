/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

export interface CallTransport {
  kind: "livekit";
  serviceUrl: string;
  roomAlias: string;
}

export function areCallTransportsEqual(
  left: CallTransport | null | undefined,
  right: CallTransport | null | undefined,
): boolean {
  if (left && right) return left.serviceUrl === right.serviceUrl;
  return left === right;
}

export function getCallTransportKey(transport: CallTransport): string {
  return `${transport.serviceUrl}|${transport.roomAlias}`;
}
