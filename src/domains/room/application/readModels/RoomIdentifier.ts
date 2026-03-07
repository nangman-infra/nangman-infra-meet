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
  viaServers: string[];
}

export function getRoomIdentifierFromUrl(
  pathname: string,
  search: string,
  hash: string,
): RoomIdentifier {
  let roomAlias: string | null = null;
  pathname = pathname.substring(1);
  const pathComponents = pathname.split("/");
  const pathHasRoom = pathComponents[0] === "room";
  const hasRoomAlias = pathComponents.length > 1;

  if (hash === "" || hash.startsWith("#?")) {
    if (hasRoomAlias && pathHasRoom) {
      roomAlias = pathComponents[1];
    }
    if (!pathHasRoom) {
      roomAlias = pathComponents[0];
    }
  } else {
    roomAlias = hash;
  }

  roomAlias = roomAlias?.split("?")[0] ?? null;

  if (roomAlias) {
    if (roomAlias.length <= 1) {
      roomAlias = null;
    } else {
      if (!roomAlias.startsWith("#")) {
        roomAlias = `#${roomAlias}`;
      }
      if (!roomAlias.includes(":")) {
        roomAlias = `${roomAlias}:${Config.defaultServerName()}`;
      }
    }
  }

  const parser = new ParamParser(search, hash);
  let roomId: string | null = parser.getParam("roomId");
  if (roomId !== null) {
    roomId = roomId.replaceAll(/^[^ -~]+|[^ -~]+$/g, "");
    if (!roomId.startsWith("!")) {
      roomId = null;
    }
  }

  return {
    roomAlias,
    roomId,
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
