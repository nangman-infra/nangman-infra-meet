/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as ClientContext from "../ClientContext";
import type { Meeting } from "../domains/meetings/domain/Meeting";
import * as MeetingsApi from "../domains/meetings/infrastructure/MeetingsApi";
import * as UiUrlContext from "../shared/application/readModels/UiUrlContext.ts";
import { HeaderStyle } from "../UrlParams";
import { MeetingDetailPage } from "./MeetingDetailPage";

const meeting: Meeting = {
  id: "meeting-1",
  title: "Weekly infra sync",
  description: "Agenda or context",
  hostUserId: "@alice:matrix.nangman.cloud",
  allowedUserIds: [],
  roomId: "!room:matrix.nangman.cloud",
  roomAlias: "#weekly-sync:matrix.nangman.cloud",
  joinUrl: "/room/weekly-sync?meetingId=meeting-1",
  accessPolicy: "open",
  allowJoinBeforeHost: false,
  status: "scheduled",
  startsAt: "2026-03-18T01:00:00.000Z",
  endsAt: null,
  createdAt: "2026-03-09T01:00:00.000Z",
  updatedAt: "2026-03-09T01:00:00.000Z",
};

describe("MeetingDetailPage", () => {
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
    vi.spyOn(MeetingsApi, "getMeeting").mockResolvedValue({ ...meeting });
    vi.spyOn(MeetingsApi, "listMeetingAttendance").mockResolvedValue([
      {
        id: "attendance-1",
        meetingId: "meeting-1",
        userId: "@alice:matrix.nangman.cloud",
        status: "present",
        joinedAt: "2026-03-18T01:05:00.000Z",
        lastSeenAt: "2026-03-18T01:05:00.000Z",
        leftAt: null,
        createdAt: "2026-03-18T01:05:00.000Z",
        updatedAt: "2026-03-18T01:05:00.000Z",
      },
    ]);
    vi.spyOn(MeetingsApi, "listMeetingAccessRequests").mockResolvedValue([]);
    vi.spyOn(MeetingsApi, "approveMeetingAccessRequest").mockResolvedValue({
      id: "request-1",
      meetingId: "meeting-1",
      userId: "@guest:matrix.nangman.cloud",
      status: "approved",
      requestedAt: "2026-03-18T01:02:00.000Z",
      respondedAt: "2026-03-18T01:03:00.000Z",
      createdAt: "2026-03-18T01:02:00.000Z",
      updatedAt: "2026-03-18T01:03:00.000Z",
    });
    vi.spyOn(MeetingsApi, "updateMeeting").mockResolvedValue({
      ...meeting,
      title: "Weekly infra sync updated",
      description: "Updated agenda",
      allowJoinBeforeHost: true,
    });
    vi.spyOn(MeetingsApi, "startMeeting").mockResolvedValue({
      ...meeting,
      status: "live",
    });
    vi.spyOn(MeetingsApi, "endMeeting").mockResolvedValue({
      ...meeting,
      status: "ended",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads meeting details and attendance", async () => {
    render(
      <MemoryRouter initialEntries={["/meetings/meeting-1"]}>
        <Routes>
          <Route path="/meetings/:meetingId" element={<MeetingDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Weekly infra sync")).toBeInTheDocument();
    expect(screen.getByText("Attendance")).toBeInTheDocument();
    expect(
      screen.getAllByText("@alice:matrix.nangman.cloud").length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Start meeting" })).toBeInTheDocument();
  });

  it("saves meeting changes from the detail form", async () => {
    render(
      <MemoryRouter initialEntries={["/meetings/meeting-1"]}>
        <Routes>
          <Route path="/meetings/:meetingId" element={<MeetingDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByDisplayValue("Weekly infra sync")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Meeting title"), {
      target: { value: "Weekly infra sync updated" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Updated agenda" },
    });
    fireEvent.click(
      screen.getByLabelText("Allow participants to join before the host"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(MeetingsApi.updateMeeting).toHaveBeenCalledWith(
        "meeting-1",
        expect.objectContaining({
          title: "Weekly infra sync updated",
          description: "Updated agenda",
          allowJoinBeforeHost: true,
          accessPolicy: "open",
        }),
        expect.objectContaining({
          userId: "@alice:matrix.nangman.cloud",
        }),
      );
    });
    expect(
      await screen.findByText("Meeting changes saved."),
    ).toBeInTheDocument();
  });

  it("shows access requests for host-approval meetings and approves them", async () => {
    vi.mocked(MeetingsApi.getMeeting).mockResolvedValue({
      ...meeting,
      accessPolicy: "host_approval",
    });
    vi.mocked(MeetingsApi.listMeetingAccessRequests).mockResolvedValue([
      {
        id: "request-1",
        meetingId: "meeting-1",
        userId: "@guest:matrix.nangman.cloud",
        status: "pending",
        requestedAt: "2026-03-18T01:02:00.000Z",
        respondedAt: null,
        createdAt: "2026-03-18T01:02:00.000Z",
        updatedAt: "2026-03-18T01:02:00.000Z",
      },
    ]);

    render(
      <MemoryRouter initialEntries={["/meetings/meeting-1"]}>
        <Routes>
          <Route path="/meetings/:meetingId" element={<MeetingDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Access requests")).toBeInTheDocument();
    expect(screen.getByText("@guest:matrix.nangman.cloud")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => {
      expect(MeetingsApi.approveMeetingAccessRequest).toHaveBeenCalledWith(
        "meeting-1",
        "request-1",
        expect.objectContaining({
          userId: "@alice:matrix.nangman.cloud",
        }),
      );
    });
  });
});
