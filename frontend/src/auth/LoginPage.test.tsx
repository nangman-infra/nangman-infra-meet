/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as ClientContext from "../ClientContext";
import { LoginPage } from "./LoginPage";

vi.mock("./useSSOLogin", (): {
  useSSOLogin: () => {
    startSSOLogin: ReturnType<typeof vi.fn>;
    completeSSOLogin: ReturnType<typeof vi.fn>;
  };
} => ({
  useSSOLogin: () => ({
    startSSOLogin: vi.fn(),
    completeSSOLogin: vi.fn(),
  }),
}));

vi.mock("../config/Config", (): {
  Config: {
    defaultHomeserverUrl: () => string;
  };
} => ({
  Config: {
    defaultHomeserverUrl: () => "https://matrix.nangman.cloud",
  },
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.spyOn(ClientContext, "useClient").mockReturnValue({
      client: undefined,
      setClient: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the default internal login context", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByText(
        "Sign in with your internal organization account to continue to the meeting workspace.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the redirect target when the user was sent to login from another page", () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/login",
            state: {
              from: {
                pathname: "/meetings/meeting-1",
                search: "?tab=overview",
              },
            },
          },
        ]}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByText(
        "Sign in to continue to the page you were trying to open: /meetings/meeting-1?tab=overview",
      ),
    ).toBeInTheDocument();
  });
});
