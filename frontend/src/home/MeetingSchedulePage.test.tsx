/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { fireEvent, render, screen } from "@testing-library/react";
import { type JSX } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Meeting } from "../domains/meetings/domain/Meeting";
import * as ClientContext from "../ClientContext";
import * as UiUrlContext from "../shared/application/readModels/UiUrlContext.ts";
import { HeaderStyle } from "../UrlParams";
import { MeetingSchedulePage } from "./MeetingSchedulePage";

const scheduledMeeting: Meeting = {
  id: "meeting-1",
  title: "Weekly infra sync",
  description: "Agenda or context",
  hostUserId: "@alice:matrix.nangman.cloud",
  allowedUserIds: [],
  roomId: "!room:matrix.nangman.cloud",
  roomAlias: "#weekly-sync:matrix.nangman.cloud",
  joinUrl: "/room/weekly-sync",
  accessPolicy: "open",
  allowJoinBeforeHost: false,
  status: "scheduled",
  startsAt: "2026-03-10T01:00:00.000Z",
  endsAt: null,
  createdAt: "2026-03-09T01:00:00.000Z",
  updatedAt: "2026-03-09T01:00:00.000Z",
};

vi.mock("./MeetingScheduler", () => ({
  MeetingScheduler: ({
    onScheduled,
  }: {
    onScheduled?: (meeting: Meeting) => void | Promise<void>;
  }): JSX.Element => (
    <button
      onClick={() => {
        void onScheduled?.(scheduledMeeting);
      }}
    >
      Finish scheduling
    </button>
  ),
}));

describe("MeetingSchedulePage", () => {
  beforeEach(() => {
    vi.spyOn(ClientContext, "useClientState").mockReturnValue({
      state: "valid",
      disconnected: false,
      authenticated: {
        client: {
          getUserId: () => "@alice:matrix.nangman.cloud",
        } as never,
        isPasswordlessUser: false,
        changePassword: vi.fn(),
        logout: vi.fn(),
      },
      supportedFeatures: {
        reactions: true,
        thumbnails: true,
      },
      setClient: vi.fn(),
    });
    vi.spyOn(UiUrlContext, "useUiUrlContext").mockReturnValue({
      lang: null,
      fonts: [],
      fontScale: null,
      theme: null,
      header: HeaderStyle.None,
      confineToRoom: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a confirmation state after scheduling a meeting", async () => {
    render(
      <MemoryRouter>
        <MeetingSchedulePage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("Finish scheduling"));

    expect(
      await screen.findByText("Your meeting is ready"),
    ).toBeInTheDocument();
    expect(screen.getByText("Weekly infra sync")).toBeInTheDocument();
    expect(screen.getByText("Join link")).toBeInTheDocument();
    expect(screen.getByText("Recommended next action")).toBeInTheDocument();
    expect(screen.getByTestId("meeting_schedule_link")).toHaveTextContent(
      "/room/weekly-sync",
    );
    expect(
      screen.getByRole("button", { name: "Manage meeting" }),
    ).toBeInTheDocument();
  });
});
