/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "./logger";

describe("matrix logger compatibility", () => {
  beforeEach(() => {
    vi.mocked(globalThis["console"].debug).mockClear();
    vi.mocked(globalThis["console"].info).mockClear();
  });

  it("routes log calls through debug", () => {
    logger.log("compat-log");

    expect(globalThis["console"].debug).toHaveBeenCalledWith("compat-log");
  });

  it("prefixes child logger messages", () => {
    const childLogger = logger.getChild("media");

    childLogger.info("ready");

    expect(globalThis["console"].info).toHaveBeenCalledWith("media", "ready");
  });
});
