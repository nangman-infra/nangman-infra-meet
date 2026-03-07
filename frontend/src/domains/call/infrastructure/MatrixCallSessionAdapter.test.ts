/*
Copyright 2025 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { describe, expect, it } from "vitest";

import {
  fromMatrixCallMembership,
  getCallMemberSessions,
  getCallSessionStats,
} from "./MatrixCallSessionAdapter.ts";

describe("MatrixCallSessionAdapter", () => {
  it("maps memberships to call member sessions", () => {
    const membership = {
      userId: "@alice:example.org",
      deviceId: "ALICE",
      eventId: "$event",
    };

    expect(
      fromMatrixCallMembership(membership),
    ).toStrictEqual({
      userId: "@alice:example.org",
      deviceId: "ALICE",
      eventId: "$event",
    });

    expect(
      getCallMemberSessions({
        memberships: [membership],
      }),
    ).toStrictEqual([
      {
        userId: "@alice:example.org",
        deviceId: "ALICE",
        eventId: "$event",
      },
    ]);
  });

  it("builds call session stats", () => {
    expect(
      getCallSessionStats({
        statistics: {
          counters: {
            roomEventEncryptionKeysSent: 2,
            roomEventEncryptionKeysReceived: 4,
          },
          totals: {
            roomEventEncryptionKeysReceivedTotalAge: 20,
          },
        },
      }),
    ).toStrictEqual({
      roomEventEncryptionKeysSent: 2,
      roomEventEncryptionKeysReceived: 4,
      roomEventEncryptionKeysReceivedAverageAge: 5,
    });
  });
});
