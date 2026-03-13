/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

export function parseAllowedUserIdsInput(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  ];
}

export function formatAllowedUserIdsInput(
  allowedUserIds: readonly string[],
): string {
  return allowedUserIds.join("\n");
}
