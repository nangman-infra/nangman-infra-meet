/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import { getUrlParams } from "../../../../UrlParams.ts";
import {
  type CallIntent,
  type CallNotificationType,
} from "../../domain/CallOptions.ts";

export interface CallUrlContext {
  password: string | null;
  showControls: boolean;
  perParticipantE2EE: boolean;
  returnToLobby: boolean;
  sendNotificationType?: CallNotificationType;
  autoLeaveWhenOthersLeft: boolean;
  waitForCallPickup: boolean;
  callIntent?: CallIntent;
}

function selectCallUrlContext(
  search = window.location.search,
  hash = window.location.hash,
): CallUrlContext {
  const params = getUrlParams(search, hash);
  return {
    password: params.password,
    showControls: params.showControls,
    perParticipantE2EE: params.perParticipantE2EE,
    returnToLobby: params.returnToLobby,
    sendNotificationType: params.sendNotificationType,
    autoLeaveWhenOthersLeft: params.autoLeaveWhenOthersLeft,
    waitForCallPickup: params.waitForCallPickup,
    callIntent: params.callIntent,
  };
}

export function getCallUrlContext(
  search = window.location.search,
  hash = window.location.hash,
): CallUrlContext {
  return selectCallUrlContext(search, hash);
}

export function useCallUrlContext(): CallUrlContext {
  const { search, hash } = useLocation();
  return useMemo(() => selectCallUrlContext(search, hash), [search, hash]);
}
