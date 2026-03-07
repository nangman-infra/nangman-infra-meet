/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

export type RoomTerminationKind = "banned" | "knockRejected" | "removed";

export class RoomTerminationError extends Error {
  public constructor(
    public readonly kind: RoomTerminationKind,
    public readonly reason?: string,
  ) {
    super(`Room terminated: ${kind}`);
  }
}
