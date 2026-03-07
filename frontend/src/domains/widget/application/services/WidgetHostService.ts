/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import type { WidgetApiPort, WidgetHostPort } from "../ports/WidgetHostPort.ts";
import { ElementWidgetActions } from "../ports/WidgetHostPort.ts";

let widgetHost: WidgetHostPort | null = null;

export function registerWidgetHost(
  host: WidgetHostPort | null,
): WidgetHostPort | null {
  widgetHost = host;
  return widgetHost;
}

export function getWidgetHost(): WidgetHostPort | null {
  return widgetHost;
}

export function hasWidgetHost(): boolean {
  return widgetHost !== null;
}

export function getWidgetApi(): WidgetApiPort | null {
  return widgetHost?.api ?? null;
}

export async function sendWidgetContentLoaded(): Promise<void> {
  await widgetHost?.api.sendContentLoaded();
}

export async function setWidgetAlwaysOnScreen(value: boolean): Promise<void> {
  await widgetHost?.api.setAlwaysOnScreen(value);
}

export async function closeWidget(): Promise<void> {
  if (!widgetHost) return;

  await widgetHost.api.transport.send(ElementWidgetActions.Close, {});
  await widgetHost.api.transport.stop();
}

export function resetWidgetHost(): void {
  widgetHost = null;
}
