/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { describe, expect, it } from "vitest";

import { resolveJoinTarget } from "./resolveJoinTarget";

describe("resolveJoinTarget", () => {
  it("resolves room aliases and localparts into room routes", () => {
    expect(resolveJoinTarget("weekly-sync")).toBe("/room/weekly-sync");
    expect(resolveJoinTarget("#weekly-sync:matrix.nangman.cloud")).toBe(
      "/room/weekly-sync:matrix.nangman.cloud",
    );
  });

  it("resolves room ids into roomId query routes", () => {
    expect(resolveJoinTarget("!room:matrix.nangman.cloud")).toBe(
      "/room?roomId=!room%3Amatrix.nangman.cloud",
    );
  });

  it("preserves full meeting links", () => {
    expect(
      resolveJoinTarget(
        "https://meet.console.nangman.cloud/room/#weekly-sync?roomId=!room:matrix.nangman.cloud",
      ),
    ).toBe("/room/#weekly-sync?roomId=!room:matrix.nangman.cloud");
  });

  it("rejects empty or ambiguous free text", () => {
    expect(resolveJoinTarget("")).toBeNull();
    expect(resolveJoinTarget("weekly sync room")).toBeNull();
  });
});
