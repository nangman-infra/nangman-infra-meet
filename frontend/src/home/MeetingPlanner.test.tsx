/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as ClientContext from "../ClientContext";
import * as MeetingsApi from "../domains/meetings/infrastructure/MeetingsApi";
import { MeetingPlanner } from "./MeetingPlanner";

describe("MeetingPlanner", () => {
  beforeEach(() => {
    vi.spyOn(ClientContext, "useClient").mockReturnValue({
      client: {
        getUserId: () => "@alice:matrix.nangman.cloud",
      } as never,
      setClient: undefined,
    });
    vi.spyOn(MeetingsApi, "listMeetings").mockResolvedValue([]);
    vi.spyOn(MeetingsApi, "listMeetingAttendanceSummaries").mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders meeting skeleton cards while the list is still loading", async () => {
    let resolveMeetings: ((meetings: []) => void) | undefined;
    vi.mocked(MeetingsApi.listMeetings).mockReturnValue(
      new Promise((resolve) => {
        resolveMeetings = resolve;
      }),
    );

    render(
      <MemoryRouter>
        <MeetingPlanner />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("meeting-planner-skeleton")).toBeInTheDocument();

    resolveMeetings?.([]);

    await waitFor(() => {
      expect(screen.getByText("No meetings yet")).toBeInTheDocument();
    });
  });

  it("opens the scheduling page from the meetings section", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<MeetingPlanner />} />
          <Route path="/meetings/new" element={<div>Schedule route</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("No meetings yet")).toBeInTheDocument();
    expect(screen.queryByLabelText("Meeting title")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Schedule meeting" }));

    expect(await screen.findByText("Schedule route")).toBeInTheDocument();
  });

  it("shows different actions for live and scheduled meetings", async () => {
    vi.mocked(MeetingsApi.listMeetings).mockResolvedValue([
      {
        id: "meeting-live",
        title: "Live room",
        description: "Running right now",
        hostUserId: "@bob:matrix.nangman.cloud",
        allowedUserIds: [],
        roomId: "!live:matrix.nangman.cloud",
        roomAlias: "#live:matrix.nangman.cloud",
        joinUrl: "/room/live",
        accessPolicy: "open",
        allowJoinBeforeHost: false,
        status: "live",
        startsAt: "2026-03-09T01:00:00.000Z",
        endsAt: null,
        createdAt: "2026-03-08T03:00:00.000Z",
        updatedAt: "2026-03-08T03:00:00.000Z",
      },
      {
        id: "meeting-scheduled",
        title: "Planned room",
        description: "Starts later",
        hostUserId: "@alice:matrix.nangman.cloud",
        allowedUserIds: [],
        roomId: "!planned:matrix.nangman.cloud",
        roomAlias: "#planned:matrix.nangman.cloud",
        joinUrl: "/room/planned",
        accessPolicy: "open",
        allowJoinBeforeHost: false,
        status: "scheduled",
        startsAt: "2026-03-10T01:00:00.000Z",
        endsAt: null,
        createdAt: "2026-03-08T03:00:00.000Z",
        updatedAt: "2026-03-08T03:00:00.000Z",
      },
    ]);
    vi.mocked(MeetingsApi.listMeetingAttendanceSummaries).mockResolvedValue([
      {
        meetingId: "meeting-live",
        presentCount: 2,
        participantCount: 3,
      },
    ]);

    render(
      <MemoryRouter>
        <MeetingPlanner />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Live room")).toBeInTheDocument();
      expect(screen.getByText("Planned room")).toBeInTheDocument();
    });

    expect(screen.getAllByRole("button", { name: "Join meeting" })).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "Start meeting" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Manage" }),
    ).toHaveLength(1);
    expect(screen.getByText("2 in the room now · 3 joined so far")).toBeInTheDocument();
  });

  it("shows join instead of management actions for scheduled meetings the user does not host", async () => {
    vi.mocked(MeetingsApi.listMeetings).mockResolvedValue([
      {
        id: "meeting-guest",
        title: "Another host room",
        description: "Guest can view but not manage",
        hostUserId: "@bob:matrix.nangman.cloud",
        allowedUserIds: [],
        roomId: "!guest:matrix.nangman.cloud",
        roomAlias: "#guest:matrix.nangman.cloud",
        joinUrl: "/room/guest",
        accessPolicy: "open",
        allowJoinBeforeHost: false,
        status: "scheduled",
        startsAt: "2026-03-10T01:00:00.000Z",
        endsAt: null,
        createdAt: "2026-03-08T03:00:00.000Z",
        updatedAt: "2026-03-08T03:00:00.000Z",
      },
    ]);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<MeetingPlanner />} />
          <Route
            path="/meetings/:meetingId"
            element={<div>Meeting detail route</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Another host room")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "View details" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Start meeting" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Manage" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View details" }));

    expect(await screen.findByText("Meeting detail route")).toBeInTheDocument();
  });
});
