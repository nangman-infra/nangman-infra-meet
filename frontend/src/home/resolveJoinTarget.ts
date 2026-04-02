/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

export function resolveJoinTarget(input: string): string | null {
  const trimmedInput = input.trim();
  if (!trimmedInput) {
    return null;
  }

  if (isLikelyUrl(trimmedInput) || trimmedInput.startsWith("/")) {
    const parsedUrl = new URL(trimmedInput, window.location.origin);
    const relativeTarget = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    return relativeTarget === "" ? null : relativeTarget;
  }

  if (trimmedInput.startsWith("!")) {
    return `/room?roomId=${encodeURIComponent(trimmedInput)}`;
  }

  if (/\s/.test(trimmedInput)) {
    return null;
  }

  const aliasOrLocalpart = trimmedInput.replace(/^#/, "");
  if (!aliasOrLocalpart) {
    return null;
  }

  return `/room/${aliasOrLocalpart}`;
}

function isLikelyUrl(input: string): boolean {
  return /^https?:\/\//i.test(input);
}
