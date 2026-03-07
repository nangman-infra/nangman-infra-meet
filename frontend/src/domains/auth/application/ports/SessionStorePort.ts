/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

export interface StoredSession {
  user_id: string;
  device_id: string;
  access_token: string;
  passwordlessUser: boolean;
  tempPassword?: string;
}

export interface SessionStorePort {
  load(): StoredSession | undefined;
  save(session: StoredSession): void;
  clear(): void;
}
