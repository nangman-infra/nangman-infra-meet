/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import {
  type SessionStorePort,
  type StoredSession,
} from "../application/ports/SessionStorePort.ts";

const SESSION_STORAGE_KEY = "matrix-auth-store";

export class LocalStorageSessionStore implements SessionStorePort {
  public load(): StoredSession | undefined {
    const data = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!data) return undefined;
    return JSON.parse(data) as StoredSession;
  }

  public save(session: StoredSession): void {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  public clear(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}
