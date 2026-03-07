/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import type { MatrixClient } from "matrix-js-sdk";

let widgetClientPromise: Promise<MatrixClient> | null = null;

export function registerMatrixWidgetClient(
  client: Promise<MatrixClient> | null,
): void {
  widgetClientPromise = client;
}

export async function loadMatrixWidgetClient(): Promise<MatrixClient | null> {
  if (!widgetClientPromise) return null;
  return await widgetClientPromise;
}
