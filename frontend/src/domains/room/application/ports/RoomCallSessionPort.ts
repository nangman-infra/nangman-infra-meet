/*
Copyright 2025 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

/**
 * Opaque group-call session handle exposed from the Room application layer.
 * Presentation/infrastructure may refine this to a concrete MatrixRTC session.
 */
export interface RoomCallSessionPort {
  room: {
    roomId: string;
  };
}
