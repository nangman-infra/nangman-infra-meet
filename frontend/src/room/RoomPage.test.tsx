/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import {
  AdminIcon,
  CheckIcon,
  CloseIcon,
  EndCallIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";
import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => new ArrayBuffer(0),
    }),
  );
});

import {
  getMeetingEntryViewMetadata,
  getRoomTerminationMessage,
} from "./RoomPage";
import { RoomTerminationError } from "../domains/room/application/errors/RoomTerminationError.ts";

describe("getMeetingEntryViewMetadata", () => {
  it.each([
    ["wait_for_host", "meeting_entry.wait_for_host", CheckIcon],
    ["request_access", "meeting_entry.request_access", AdminIcon],
    ["pending_approval", "meeting_entry.pending_approval", CheckIcon],
    ["rejected", "meeting_entry.rejected", CloseIcon],
    ["not_invited", "meeting_entry.not_invited", CloseIcon],
    ["meeting_closed", "meeting_entry.meeting_closed", EndCallIcon],
  ] as const)(
    "returns the expected metadata for %s",
    (decisionKind, metadataKey, Icon) => {
      expect(getMeetingEntryViewMetadata(decisionKind)).toEqual({
        metadataKey,
        Icon,
      });
    },
  );

  it("falls back to the request access metadata for allow", () => {
    expect(getMeetingEntryViewMetadata("allow")).toEqual({
      metadataKey: "meeting_entry.request_access",
      Icon: AdminIcon,
    });
  });
});

describe("getRoomTerminationMessage", () => {
  const t = (key: string): string => key;

  it.each([
    [
      new RoomTerminationError("banned"),
      AdminIcon,
      "group_call_loader.banned_heading",
      "group_call_loader.banned_body",
    ],
    [
      new RoomTerminationError("knockRejected"),
      CloseIcon,
      "group_call_loader.knock_reject_heading",
      "group_call_loader.knock_reject_body",
    ],
    [
      new RoomTerminationError("ended" as never),
      EndCallIcon,
      "group_call_loader.call_ended_heading",
      "group_call_loader.call_ended_body",
    ],
  ] as const)(
    "returns the expected copy for %s",
    (error, Icon, title, body) => {
      expect(getRoomTerminationMessage(error, t)).toEqual({
        Icon,
        title,
        body,
      });
    },
  );
});
