/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as MeetingsApi from "../domains/meetings/infrastructure/MeetingsApi";
import { MeetingPlanner } from "./MeetingPlanner";

describe("MeetingPlanner", () => {
  beforeEach(() => {
    vi.spyOn(MeetingsApi, "listMeetings").mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routes scheduling into a separate page flow", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<MeetingPlanner />} />
          <Route path="/meetings/new" element={<div>Schedule route</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("No upcoming meetings yet")).toBeInTheDocument();
    expect(screen.queryByLabelText("Meeting title")).not.toBeInTheDocument();

    await screen.getByRole("button", { name: "Schedule meeting" }).click();

    expect(await screen.findByText("Schedule route")).toBeInTheDocument();
  });

  it("keeps scheduled and live actions distinct inside the meetings workspace", async () => {
    vi.mocked(MeetingsApi.listMeetings).mockResolvedValue([
      {
        id: "meeting-live",
        title: "Live room",
        description: "Running right now",
        hostUserId: "@alice:matrix.nangman.cloud",
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

    render(
      <MemoryRouter>
        <MeetingPlanner />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Live room")).toBeInTheDocument();
      expect(screen.getByText("Planned room")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Join meeting" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start meeting" })).toBeInTheDocument();
  });
});
