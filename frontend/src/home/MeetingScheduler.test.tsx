/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type MatrixClient } from "matrix-js-sdk";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as MeetingsApi from "../domains/meetings/infrastructure/MeetingsApi";
import * as MatrixUtils from "../utils/matrix";
import { MeetingScheduler } from "./MeetingScheduler";

const leaveRoom = vi.fn();
const forgetRoom = vi.fn();
const mockClient = {
  getUserId: () => "@alice:matrix.nangman.cloud",
  leave: leaveRoom,
  forget: forgetRoom,
} as unknown as MatrixClient;

describe("MeetingScheduler", () => {
  beforeEach(() => {
    leaveRoom.mockReset().mockResolvedValue(undefined);
    forgetRoom.mockReset().mockResolvedValue(undefined);
    vi.spyOn(MeetingsApi, "createMeeting").mockResolvedValue({
      id: "meeting-1",
      title: "Weekly infra sync",
      description: "Agenda or context",
      hostUserId: "@alice:matrix.nangman.cloud",
      allowedUserIds: [],
      roomId: "!room:matrix.nangman.cloud",
      roomAlias: "#weekly-infra-sync:matrix.nangman.cloud",
      joinUrl: "/room/weekly-infra-sync",
      accessPolicy: "open",
      allowJoinBeforeHost: false,
      status: "scheduled",
      startsAt: "2026-03-09T00:15:00.000Z",
      endsAt: null,
      createdAt: "2026-03-08T03:00:00.000Z",
      updatedAt: "2026-03-08T03:00:00.000Z",
    });
    vi.spyOn(MatrixUtils, "createRoom").mockResolvedValue({
      roomId: "!room:matrix.nangman.cloud",
      alias: "#weekly-infra-sync:matrix.nangman.cloud",
      password: "secret",
    });
    vi.spyOn(MatrixUtils, "getRelativeRoomUrl").mockReturnValue(
      "/room/weekly-infra-sync",
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders only the scheduling form on the schedule page", () => {
    render(
      <MemoryRouter>
        <MeetingScheduler client={mockClient} />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("Meeting title")).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
    expect(screen.getByLabelText("Time")).toBeInTheDocument();
    expect(screen.getByText("Access policy")).toBeInTheDocument();
    expect(screen.queryByText("No meetings yet")).not.toBeInTheDocument();
  });

  it("rejects past meeting times before creating a room", async () => {
    render(
      <MemoryRouter>
        <MeetingScheduler client={mockClient} />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Meeting title"), {
      target: { value: "Past meeting" },
    });
    const pastStartAt = createLocalDateTimeParts(-60 * 60 * 1000);
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: pastStartAt.date },
    });
    fireEvent.change(screen.getByLabelText("Time"), {
      target: { value: pastStartAt.time },
    });

    fireEvent.click(screen.getByRole("button", { name: "Schedule meeting" }));

    expect(
      await screen.findByText(
        "Choose a future date and time for a scheduled meeting.",
      ),
    ).toBeInTheDocument();
    expect(MatrixUtils.createRoom).not.toHaveBeenCalled();
    expect(MeetingsApi.createMeeting).not.toHaveBeenCalled();
  });

  it("combines date and time into the meeting startsAt payload", async () => {
    const onScheduled = vi.fn();

    render(
      <MemoryRouter>
        <MeetingScheduler client={mockClient} onScheduled={onScheduled} />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Meeting title"), {
      target: { value: "Weekly infra sync" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Agenda or context" },
    });
    const futureStartAt = createLocalDateTimeParts(
      24 * 60 * 60 * 1000 + 75 * 60 * 1000,
    );
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: futureStartAt.date },
    });
    fireEvent.change(screen.getByLabelText("Time"), {
      target: { value: futureStartAt.time },
    });

    fireEvent.click(screen.getByRole("button", { name: "Schedule meeting" }));

    await waitFor(() => {
      expect(MeetingsApi.createMeeting).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Weekly infra sync",
          description: "Agenda or context",
          startsAt: new Date(
            `${futureStartAt.date}T${futureStartAt.time}`,
          ).toISOString(),
        }),
        expect.objectContaining({
          userId: "@alice:matrix.nangman.cloud",
        }),
      );
    });
    await waitFor(() => {
      expect(onScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "meeting-1",
          joinUrl: "/room/weekly-infra-sync",
          title: "Weekly infra sync",
        }),
      );
    });
  });

  it("submits invite-only policy and allowed users", async () => {
    render(
      <MemoryRouter>
        <MeetingScheduler client={mockClient} />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Meeting title"), {
      target: { value: "Leadership sync" },
    });
    const futureStartAt = createLocalDateTimeParts(24 * 60 * 60 * 1000);
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: futureStartAt.date },
    });
    fireEvent.change(screen.getByLabelText("Time"), {
      target: { value: futureStartAt.time },
    });
    fireEvent.click(screen.getByRole("button", { name: "Invite only" }));
    fireEvent.click(
      screen.getByLabelText("Allow participants to join before the host"),
    );
    fireEvent.change(screen.getByLabelText("Allowed Matrix user IDs"), {
      target: {
        value: "@alice:matrix.nangman.cloud\n@bob:matrix.nangman.cloud",
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Schedule meeting" }));

    await waitFor(() => {
      expect(MeetingsApi.createMeeting).toHaveBeenCalledWith(
        expect.objectContaining({
          accessPolicy: "invite_only",
          allowJoinBeforeHost: true,
          allowedUserIds: [
            "@alice:matrix.nangman.cloud",
            "@bob:matrix.nangman.cloud",
          ],
        }),
        expect.anything(),
      );
    });
    expect(screen.getByText("Access policy")).toBeInTheDocument();
  });

  it("cleans up the created room when meeting persistence fails", async () => {
    vi.mocked(MeetingsApi.createMeeting).mockRejectedValue(
      new Error("Persistence failed"),
    );

    render(
      <MemoryRouter>
        <MeetingScheduler client={mockClient} />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Meeting title"), {
      target: { value: "Cleanup room" },
    });
    const futureStartAt = createLocalDateTimeParts(24 * 60 * 60 * 1000);
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: futureStartAt.date },
    });
    fireEvent.change(screen.getByLabelText("Time"), {
      target: { value: futureStartAt.time },
    });

    fireEvent.click(screen.getByRole("button", { name: "Schedule meeting" }));

    await waitFor(() => {
      expect(leaveRoom).toHaveBeenCalledWith("!room:matrix.nangman.cloud");
      expect(forgetRoom).toHaveBeenCalledWith("!room:matrix.nangman.cloud");
    });
    expect(
      await screen.findByText("Persistence failed"),
    ).toBeInTheDocument();
  });
});

function createLocalDateTimeParts(offsetMs: number): {
  date: string;
  time: string;
} {
  const value = new Date(Date.now() + offsetMs);
  return {
    date: formatDate(value),
    time: formatTime(value),
  };
}

function formatDate(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(value: Date): string {
  const hours = `${value.getHours()}`.padStart(2, "0");
  const minutes = `${value.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}
