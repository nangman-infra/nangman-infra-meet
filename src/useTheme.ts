/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { WidgetApiToWidgetAction } from "matrix-widget-api";
import { type IThemeChangeActionRequest } from "matrix-widget-api";

import { getWidgetHost } from "./domains/widget/application/services/WidgetHostService.ts";
import { getUiUrlContext } from "./shared/application/readModels/UiUrlContext.ts";

export const useTheme = (): void => {
  const [requestedTheme, setRequestedTheme] = useState(
    () => getUiUrlContext().theme,
  );
  const previousTheme = useRef<string | null>(document.body.classList.item(0));

  useEffect(() => {
    const widgetHost = getWidgetHost();
    if (!widgetHost) return;

    const onThemeChange = (
      ev: CustomEvent<IThemeChangeActionRequest>,
    ): void => {
      ev.preventDefault();
      if ("name" in ev.detail.data && typeof ev.detail.data.name === "string")
        setRequestedTheme(ev.detail.data.name);
      widgetHost.api.transport.reply(ev.detail, {});
    };

    widgetHost.lazyActions.on(
      WidgetApiToWidgetAction.ThemeChange,
      onThemeChange,
    );
    return (): void => {
      widgetHost.lazyActions.off(
        WidgetApiToWidgetAction.ThemeChange,
        onThemeChange,
      );
    };
  }, []);

  useLayoutEffect(() => {
    // If no theme has been explicitly requested we default to dark
    const theme = requestedTheme?.includes("light") ? "light" : "dark";
    const themeHighContrast = requestedTheme?.includes("high-contrast")
      ? "-hc"
      : "";
    const themeString = "cpd-theme-" + theme + themeHighContrast;
    if (themeString !== previousTheme.current) {
      document.body.classList.remove(
        "cpd-theme-light",
        "cpd-theme-dark",
        "cpd-theme-light-hc",
        "cpd-theme-dark-hc",
      );
      document.body.classList.add(themeString);
      previousTheme.current = themeString;
    }
    document.body.classList.remove("no-theme");
  }, [previousTheme, requestedTheme]);
};
