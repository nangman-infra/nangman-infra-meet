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
    vi.spyOn(ClientContext, "useClientState").mockReturnValue(
      createAuthenticatedClientState("@alice:matrix.nangman.cloud"),
    );
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
    vi.spyOn(MeetingsApi, "getMeetingEntryAccess").mockResolvedValue({
      kind: "allow",
      meetingId: "meeting-1",
      title: "Weekly infra sync",
      hostUserId: "@alice:matrix.nangman.cloud",
      status: "live",
      accessPolicy: "open",
      allowJoinBeforeHost: true,
    });
    vi.spyOn(MeetingsApi, "requestMeetingAccess").mockResolvedValue({
      id: "request-1",
      meetingId: "meeting-1",
      userId: "@bob:matrix.nangman.cloud",
      status: "pending",
      requestedAt: "2026-03-18T01:02:00.000Z",
      respondedAt: null,
      createdAt: "2026-03-18T01:02:00.000Z",
      updatedAt: "2026-03-18T01:02:00.000Z",
    });
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
    expect(screen.getByText("My role")).toBeInTheDocument();
    expect(screen.getByText("Current meeting status")).toBeInTheDocument();
    expect(screen.getByText("What you can do now")).toBeInTheDocument();
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

  it("hides host-only sections for non-host viewers", async () => {
    vi.mocked(ClientContext.useClientState).mockReturnValue(
      createAuthenticatedClientState("@bob:matrix.nangman.cloud"),
    );
    vi.mocked(MeetingsApi.getMeetingEntryAccess).mockResolvedValue({
      kind: "wait_for_host",
      meetingId: "meeting-1",
      title: "Weekly infra sync",
      hostUserId: "@alice:matrix.nangman.cloud",
      status: "scheduled",
      accessPolicy: "open",
      allowJoinBeforeHost: false,
    });

    render(
      <MemoryRouter initialEntries={["/meetings/meeting-1"]}>
        <Routes>
          <Route path="/meetings/:meetingId" element={<MeetingDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Weekly infra sync")).toBeInTheDocument();
    expect(
      await screen.findByText("Waiting for the host to start"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Wait for the host to start the meeting, then refresh if this page does not update yet.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Attendance")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Start meeting" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Join meeting" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save changes" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Join link")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Refresh" }),
    ).toBeInTheDocument();
    expect(MeetingsApi.listMeetingAttendance).not.toHaveBeenCalled();
  });

  it("shows request access instead of join actions for host-approval meetings", async () => {
    vi.mocked(ClientContext.useClientState).mockReturnValue(
      createAuthenticatedClientState("@bob:matrix.nangman.cloud"),
    );
    vi.mocked(MeetingsApi.getMeeting).mockResolvedValue({
      ...meeting,
      accessPolicy: "host_approval",
      status: "live",
    });
    vi.mocked(MeetingsApi.getMeetingEntryAccess)
      .mockResolvedValue({
        kind: "pending_approval",
        meetingId: "meeting-1",
        title: "Weekly infra sync",
        hostUserId: "@alice:matrix.nangman.cloud",
        status: "live",
        accessPolicy: "host_approval",
        allowJoinBeforeHost: false,
      })
      .mockResolvedValueOnce({
        kind: "request_access",
        meetingId: "meeting-1",
        title: "Weekly infra sync",
        hostUserId: "@alice:matrix.nangman.cloud",
        status: "live",
        accessPolicy: "host_approval",
        allowJoinBeforeHost: false,
      });

    render(
      <MemoryRouter initialEntries={["/meetings/meeting-1"]}>
        <Routes>
          <Route path="/meetings/:meetingId" element={<MeetingDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Weekly infra sync")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Request access" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Join meeting" })).not.toBeInTheDocument();
    expect(screen.queryByText("Join link")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Request access" }));

    await waitFor(() => {
      expect(MeetingsApi.requestMeetingAccess).toHaveBeenCalledWith(
        "meeting-1",
        expect.objectContaining({
          userId: "@bob:matrix.nangman.cloud",
        }),
      );
    });
    expect(
      await screen.findByText("Waiting for host approval"),
    ).toBeInTheDocument();
  });

  it("hides edit and join actions once a meeting has ended", async () => {
    vi.mocked(MeetingsApi.getMeeting).mockResolvedValue({
      ...meeting,
      status: "ended",
      endsAt: "2026-03-18T02:00:00.000Z",
    });

    render(
      <MemoryRouter initialEntries={["/meetings/meeting-1"]}>
        <Routes>
          <Route path="/meetings/:meetingId" element={<MeetingDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Weekly infra sync")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Join meeting" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save changes" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancel meeting" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "End meeting" }),
    ).not.toBeInTheDocument();
  });
});

function createAuthenticatedClientState(userId: string): ReturnType<typeof ClientContext.useClientState> {
  return {
    state: "valid",
    disconnected: false,
    authenticated: {
      client: {
        getUserId: () => userId,
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
  };
}
