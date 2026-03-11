/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { fireEvent, render, screen } from "@testing-library/react";
import { type MatrixClient } from "matrix-js-sdk";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as MeetingsApi from "../domains/meetings/infrastructure/MeetingsApi";
import * as GroupCallRooms from "./useGroupCallRooms";
import * as Settings from "../settings/settings";
import { HeaderStyle } from "../UrlParams";
import * as UiUrlContext from "../shared/application/readModels/UiUrlContext.ts";
import { RegisteredView } from "./RegisteredView";

describe("RegisteredView", () => {
  beforeEach(() => {
    vi.spyOn(MeetingsApi, "listMeetings").mockResolvedValue([]);
    vi.spyOn(GroupCallRooms, "useGroupCallRooms").mockReturnValue([]);
    vi.spyOn(Settings, "useOptInAnalytics").mockReturnValue([false, null]);
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

  it("keeps the instant launcher separate from the scheduling route", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<RegisteredView client={{} as MatrixClient} />} />
          <Route path="/meetings/new" element={<div>Schedule route</div>} />
          <Route path="/room/:roomName" element={<div>Join route</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByText(
        "Pick the fastest path for what you need to do right now: start immediately, jump into an existing room, or schedule something for later.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Instant call")).toBeInTheDocument();
    expect(screen.getByText("Planned meetings")).toBeInTheDocument();
    expect(screen.getByText("Join existing")).toBeInTheDocument();
    expect(screen.queryByLabelText("Meeting title")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open scheduler" }));

    expect(await screen.findByText("Schedule route")).toBeInTheDocument();
  });

  it("supports a direct join flow from the home actions", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<RegisteredView client={{} as MatrixClient} />} />
          <Route path="/room/:roomName" element={<div>Join route</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Link or room"), {
      target: { value: "weekly-sync" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Join meeting" }));

    expect(await screen.findByText("Join route")).toBeInTheDocument();
  });
});
