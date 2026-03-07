/*
Copyright 2025 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

export interface CallSessionStats {
  roomEventEncryptionKeysSent: number;
  roomEventEncryptionKeysReceived: number;
  roomEventEncryptionKeysReceivedAverageAge: number;
}
