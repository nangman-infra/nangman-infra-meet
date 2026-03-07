/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import "global-jsdom/register";
import "@formatjs/intl-durationformat/polyfill";
import "@formatjs/intl-segmenter/polyfill";
import i18n from "i18next";
import posthog from "posthog-js";
import { initReactI18next } from "react-i18next";
import { afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "vitest-axe/extend-expect";
import { logger } from "matrix-js-sdk/lib/logger";
import "@testing-library/jest-dom/vitest";

import EN from "../locales/en/app.json";
import { Config } from "./config/Config";

// Bare-minimum i18n config
i18n
  .use(initReactI18next)
  .init({
    lng: "en",
    fallbackLng: "en",
    supportedLngs: ["en"],
    // We embed the translations, so that it never needs to fetch
    resources: {
      en: {
        translation: EN,
      },
    },
    interpolation: {
      escapeValue: false, // React has built-in XSS protections
    },
  })
  .catch((e) => logger.warn("Failed to init i18n for testing", e));

Config.initDefault();
posthog.opt_out_capturing();

beforeAll(() => {
  (
    globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT: boolean;
    }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  const originalConsoleError = console.error.bind(console);
  vi.spyOn(console, "debug").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const text = args
      .map((arg) =>
        typeof arg === "string"
          ? arg
          : arg instanceof Error
            ? `${arg.name}: ${arg.message}`
            : "",
      )
      .join(" ");
    if (text.includes("not wrapped in act(...)")) return;
    if (text.includes("invalid value for the `width` css style property")) return;
    originalConsoleError(...args);
  });
});

afterEach(cleanup);

// Used by a lot of components
window.matchMedia = global.matchMedia = (): MediaQueryList =>
  ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }) as Partial<MediaQueryList> as MediaQueryList;
