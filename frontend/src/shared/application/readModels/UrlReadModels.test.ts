/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { describe, expect, test } from "vitest";

import { HeaderStyle } from "../../../UrlParams.ts";
import { getHomeserverUrlContext } from "../../../domains/auth/application/readModels/HomeserverUrlContext.ts";
import { getCallUrlContext } from "../../../domains/call/application/readModels/CallUrlContext.ts";
import { getE2eeUrlContext } from "../../../domains/e2ee/application/readModels/E2eeUrlContext.ts";
import { getMediaUrlContext } from "../../../domains/media/application/readModels/MediaUrlContext.ts";
import { getRoomEntryUrlContext } from "../../../domains/room/application/readModels/RoomEntryUrlContext.ts";
import { getWidgetUrlContext } from "../../../domains/widget/application/readModels/WidgetUrlContext.ts";
import { getTelemetryUrlContext } from "./TelemetryUrlContext.ts";
import { getUiUrlContext } from "./UiUrlContext.ts";

describe("URL read models", () => {
  test("maps widget-specific params into a widget context", () => {
    expect(
      getWidgetUrlContext(
        "?widgetId=abc&parentUrl=https%3A%2F%2Fexample.org&roomId=%21room%3Aexample.org&userId=%40alice%3Aexample.org&deviceId=DEVICE&baseUrl=https%3A%2F%2Fhs.example.org&preload=true&skipLobby=true&returnToLobby=true",
        "",
      ),
    ).toMatchObject({
      widgetMode: true,
      widgetId: "abc",
      parentUrl: "https://example.org",
      roomId: "!room:example.org",
      userId: "@alice:example.org",
      deviceId: "DEVICE",
      baseUrl: "https://hs.example.org",
      preload: true,
      skipLobby: true,
      returnToLobby: true,
    });
  });

  test("maps UI-specific params into a UI context", () => {
    expect(
      getUiUrlContext(
        "?header=app_bar&confineToRoom=true&lang=ko&font=IBM%20Plex%20Sans&fontScale=1.2&theme=light-high-contrast",
        "",
      ),
    ).toEqual({
      header: HeaderStyle.AppBar,
      confineToRoom: true,
      lang: "ko",
      fonts: ["IBM Plex Sans"],
      fontScale: 1.2,
      theme: "light-high-contrast",
    });
  });

  test("maps telemetry-specific params into a telemetry context", () => {
    expect(
      getTelemetryUrlContext(
        "?posthogApiHost=https%3A%2F%2Fph.example.org&posthogApiKey=key123&posthogUserId=user123&rageshakeSubmitUrl=https%3A%2F%2Frs.example.org&sentryDsn=dsn123&sentryEnvironment=staging",
        "",
      ),
    ).toEqual({
      posthogApiHost: "https://ph.example.org",
      posthogApiKey: "key123",
      posthogUserId: "user123",
      rageshakeSubmitUrl: "https://rs.example.org",
      sentryDsn: "dsn123",
      sentryEnvironment: "staging",
    });
  });

  test("maps call-specific params into a call context", () => {
    expect(
      getCallUrlContext(
        "?password=secret&showControls=false&perParticipantE2EE=true&sendNotificationType=ring&autoLeave=true&waitForCallPickup=true",
        "",
      ),
    ).toEqual({
      password: "secret",
      showControls: false,
      perParticipantE2EE: true,
      returnToLobby: false,
      sendNotificationType: "ring",
      autoLeaveWhenOthersLeft: true,
      waitForCallPickup: true,
      callIntent: undefined,
    });
  });

  test("maps widget-derived call params into a call context", () => {
    expect(
      getCallUrlContext(
        "?widgetId=abc&parentUrl=https%3A%2F%2Fexample.org&returnToLobby=true&intent=join_existing_dm_voice",
        "",
      ),
    ).toEqual({
      password: null,
      showControls: true,
      perParticipantE2EE: true,
      returnToLobby: true,
      sendNotificationType: "notification",
      autoLeaveWhenOthersLeft: true,
      waitForCallPickup: false,
      callIntent: "audio",
    });
  });

  test("maps media-specific params into a media context", () => {
    expect(
      getMediaUrlContext(
        "?controlledAudioDevices=true&hideScreensharing=true&skipLobby=true",
        "",
      ),
    ).toEqual({
      controlledAudioDevices: true,
      hideScreensharing: true,
      skipLobby: false,
    });

    expect(
      getMediaUrlContext(
        "?widgetId=abc&parentUrl=https%3A%2F%2Fexample.org&controlledAudioDevices=true&hideScreensharing=true&skipLobby=true",
        "",
      ),
    ).toEqual({
      controlledAudioDevices: true,
      hideScreensharing: true,
      skipLobby: true,
    });
  });

  test("maps room entry params into a room entry context", () => {
    expect(
      getRoomEntryUrlContext(
        "?widgetId=abc&parentUrl=https%3A%2F%2Fexample.org&confineToRoom=true&appPrompt=false&preload=true&header=app_bar&skipLobby=true",
        "",
      ),
    ).toEqual({
      confineToRoom: true,
      preload: true,
      header: HeaderStyle.AppBar,
      skipLobby: true,
    });
  });

  test("maps homeserver params into a homeserver context", () => {
    expect(getHomeserverUrlContext("?homeserver=https%3A%2F%2Fhs.example.org", "")).toEqual({
      homeserver: "https://hs.example.org",
    });
  });

  test("maps E2EE params into an encryption context", () => {
    expect(
      getE2eeUrlContext(
        "?roomId=%21room%3Aexample.org&password=secret&enableE2EE=false",
        "",
      ),
    ).toEqual({
      roomId: "!room:example.org",
      password: "secret",
      e2eEnabled: false,
    });
  });
});
