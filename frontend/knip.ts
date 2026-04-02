/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type KnipConfig } from "knip";

export default {
  vite: {
    config: ["vite.config.ts", "vite-embedded.config.ts"],
  },
  entry: ["src/main.tsx"],
  ignore: [
    // Yarn Berry keeps the active linker plugin here, but it is not imported
    // from application code and should not fail unused-file analysis.
    ".yarn/plugins/linker.cjs",
  ],
  ignoreDependencies: [
    // Used in CSS
    "normalize.css",
    // Used for its global type declarations
    "@types/grecaptcha",
    // Because we use matrix-js-sdk as a Git dependency rather than consuming
    // the proper release artifacts, and also import directly from src/, we're
    // forced to re-install some of the types that it depends on even though
    // these look unused to Knip
    "@types/content-type",
    "@types/sdp-transform",
    "@types/uuid",
  ],
  ignoreExportsUsedInFile: true,
} satisfies KnipConfig;
