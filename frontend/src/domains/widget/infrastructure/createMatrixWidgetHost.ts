/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { logger } from "matrix-js-sdk/lib/logger";
import { EventType, createRoomWidgetClient } from "matrix-js-sdk";
import {
  WidgetApi,
  MatrixCapabilities,
  WidgetApiToWidgetAction,
} from "matrix-widget-api";

import type { MatrixClient } from "matrix-js-sdk";
import type { IWidgetApiRequest } from "matrix-widget-api";
import { LazyEventEmitter } from "../../../LazyEventEmitter.ts";
import { Config } from "../../../config/Config.ts";
import { ElementCallReactionEventType } from "../../../reactions/index.ts";
import {
  ElementWidgetActions,
  type WidgetHostPort,
} from "../application/ports/WidgetHostPort.ts";
import { getWidgetUrlContext } from "../application/readModels/WidgetUrlContext.ts";

export interface MatrixWidgetEnvironment {
  host: WidgetHostPort;
  client: Promise<MatrixClient>;
}

export function createMatrixWidgetEnvironment(): MatrixWidgetEnvironment | null {
  try {
    const {
      widgetId,
      parentUrl,
      roomId,
      userId,
      deviceId,
      baseUrl,
      e2eEnabled,
      allowIceFallback,
    } = getWidgetUrlContext();

    if (widgetId && parentUrl) {
      const parentOrigin = new URL(parentUrl).origin;
      logger.info("Widget API is available");
      const api = new WidgetApi(widgetId, parentOrigin);
      api.requestCapability(MatrixCapabilities.AlwaysOnScreen);

      const lazyActions = new LazyEventEmitter();
      [
        WidgetApiToWidgetAction.ThemeChange,
        ElementWidgetActions.JoinCall,
        ElementWidgetActions.HangupCall,
        ElementWidgetActions.TileLayout,
        ElementWidgetActions.SpotlightLayout,
        ElementWidgetActions.DeviceMute,
      ].forEach((action) => {
        api.on(`action:${action}`, (ev: CustomEvent<IWidgetApiRequest>) => {
          ev.preventDefault();
          lazyActions.emit(action, ev);
        });
      });

      if (!roomId) throw new Error("Room ID must be supplied");
      if (!userId) throw new Error("User ID must be supplied");
      if (!deviceId) throw new Error("Device ID must be supplied");
      if (!baseUrl) throw new Error("Base URL must be supplied");

      const sendEvent = [EventType.CallNotify, EventType.RTCNotification];
      const sendRecvEvent = [
        "org.matrix.rageshake_request",
        EventType.CallEncryptionKeysPrefix,
        EventType.Reaction,
        EventType.RoomRedaction,
        ElementCallReactionEventType,
        EventType.RTCDecline,
      ];

      const sendState = [
        userId,
        `_${userId}_${deviceId}_m.call`,
        `${userId}_${deviceId}_m.call`,
      ].map((stateKey) => ({
        eventType: EventType.GroupCallMemberPrefix,
        stateKey,
      }));
      const receiveState = [
        { eventType: EventType.RoomCreate },
        { eventType: EventType.RoomName },
        { eventType: EventType.RoomMember },
        { eventType: EventType.RoomEncryption },
        { eventType: EventType.GroupCallMemberPrefix },
      ];

      const sendRecvToDevice = [
        EventType.CallInvite,
        EventType.CallCandidates,
        EventType.CallAnswer,
        EventType.CallHangup,
        EventType.CallReject,
        EventType.CallSelectAnswer,
        EventType.CallNegotiate,
        EventType.CallSDPStreamMetadataChanged,
        EventType.CallSDPStreamMetadataChangedPrefix,
        EventType.CallReplaces,
        EventType.CallEncryptionKeysPrefix,
      ];

      const client = createRoomWidgetClient(
        api,
        {
          sendEvent: [...sendEvent, ...sendRecvEvent],
          receiveEvent: sendRecvEvent,
          sendState,
          receiveState,
          sendToDevice: sendRecvToDevice,
          receiveToDevice: sendRecvToDevice,
          turnServers: false,
          sendDelayedEvents: true,
          updateDelayedEvents: true,
        },
        roomId,
        {
          baseUrl,
          userId,
          deviceId,
          timelineSupport: true,
          useE2eForGroupCall: e2eEnabled,
          fallbackICEServerAllowed: allowIceFallback,
        },
        false,
      );

      const clientPromise = async (): Promise<MatrixClient> => {
        await Config.init();
        await client.startClient({ clientWellKnownPollPeriod: 60 * 10 });
        return client;
      };

      return {
        host: { api, lazyActions },
        client: clientPromise(),
      };
    }

    if (import.meta.env.MODE !== "test") logger.info("No widget API available");
    return null;
  } catch (e) {
    logger.warn("Continuing without the widget API", e);
    return null;
  }
}
