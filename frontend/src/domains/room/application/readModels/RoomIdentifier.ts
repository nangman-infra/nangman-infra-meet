/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import { Config } from "../../../../config/Config.ts";
import { ParamParser } from "../../../../shared/url/ParamParser.ts";

export interface RoomIdentifier {
  roomAlias: string | null;
  roomId: string | null;
  meetingId: string | null;
  viaServers: string[];
}

function getRawRoomAlias(pathname: string, hash: string): string | null {
  if (hash !== "" && !hash.startsWith("#?")) {
    return hash;
  }

  const pathComponents = pathname.substring(1).split("/");
  const [firstPathComponent, secondPathComponent] = pathComponents;

  if (firstPathComponent === "room") {
    return secondPathComponent ?? null;
  }

  return firstPathComponent ?? null;
}

function normalizeRoomAlias(roomAlias: string | null): string | null {
  const trimmedRoomAlias = roomAlias?.split("?")[0] ?? null;

  if (!trimmedRoomAlias || trimmedRoomAlias.length <= 1) {
    return null;
  }

  const canonicalRoomAlias = trimmedRoomAlias.startsWith("#")
    ? trimmedRoomAlias
    : `#${trimmedRoomAlias}`;

  return canonicalRoomAlias.includes(":")
    ? canonicalRoomAlias
    : `${canonicalRoomAlias}:${Config.defaultServerName()}`;
}

function parseRoomId(parser: ParamParser): string | null {
  const roomId = parser.getParam("roomId");
  if (roomId === null) {
    return null;
  }

  const normalizedRoomId = roomId.replaceAll(/(?:^[^ -~]+)|(?:[^ -~]+$)/g, "");
  return normalizedRoomId.startsWith("!") ? normalizedRoomId : null;
}

export function getRoomIdentifierFromUrl(
  pathname: string,
  search: string,
  hash: string,
): RoomIdentifier {
  const parser = new ParamParser(search, hash);
  const meetingId = parser.getParam("meetingId")?.trim() || null;

  return {
    roomAlias: normalizeRoomAlias(getRawRoomAlias(pathname, hash)),
    roomId: parseRoomId(parser),
    meetingId,
    viaServers: parser.getAllParams("viaServers"),
  };
}

export const useRoomIdentifier = (): RoomIdentifier => {
  const { pathname, search, hash } = useLocation();
  return useMemo(
    () => getRoomIdentifierFromUrl(pathname, search, hash),
    [pathname, search, hash],
  );
};
