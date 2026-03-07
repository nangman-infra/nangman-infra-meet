/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import {
  type IWidgetApiRequest,
  type IWidgetApiRequestData,
  type IWidgetApiResponseData,
  type WidgetApiAction,
} from "matrix-widget-api";
import { NEVER, fromEvent, type Observable } from "rxjs";

import { getWidgetHost } from "./WidgetHostService.ts";

export function observeWidgetAction$(
  action: WidgetApiAction,
): Observable<CustomEvent<IWidgetApiRequest>> {
  const widgetHost = getWidgetHost();
  if (!widgetHost) return NEVER;

  return fromEvent(widgetHost.lazyActions, action) as Observable<
    CustomEvent<IWidgetApiRequest>
  >;
}

export function subscribeToWidgetAction(
  action: WidgetApiAction,
  listener: (event: CustomEvent<IWidgetApiRequest>) => void,
): (() => void) | null {
  const widgetHost = getWidgetHost();
  if (!widgetHost) return null;

  widgetHost.lazyActions.on(action, listener);
  return (): void => widgetHost.lazyActions.off(action, listener);
}

export function replyToWidgetAction(
  request: IWidgetApiRequest,
  data: IWidgetApiResponseData = {},
): void {
  getWidgetHost()?.api.transport.reply(request, data);
}

export async function sendWidgetAction(
  action: WidgetApiAction,
  data: IWidgetApiRequestData = {},
): Promise<void> {
  await getWidgetHost()?.api.transport.send(action, data);
}
