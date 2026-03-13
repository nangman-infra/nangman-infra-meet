/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InputField } from "./Input";

describe("InputField", () => {
  it("renders text input descriptions outside the bordered field", () => {
    render(
      <InputField
        type="text"
        label="Link or room"
        placeholder="Paste a link"
        description="Accepted formats: full meeting links, #room-alias:server, or !room-id:server."
      />,
    );

    const input = screen.getByLabelText("Link or room");
    const description = screen.getByText(
      "Accepted formats: full meeting links, #room-alias:server, or !room-id:server.",
    );

    expect(input).toHaveAttribute("aria-describedby", description.id);
    expect(input.parentElement).not.toContainElement(description);
  });

  it("keeps checkbox descriptions inside the field wrapper", () => {
    render(
      <InputField
        type="checkbox"
        label="Enable notifications"
        description="Show a banner when someone joins."
      />,
    );

    const checkbox = screen.getByLabelText("Enable notifications");
    const description = screen.getByText("Show a banner when someone joins.");

    expect(checkbox).toHaveAttribute("aria-describedby", description.id);
    expect(checkbox.parentElement).toContainElement(description);
  });
});
