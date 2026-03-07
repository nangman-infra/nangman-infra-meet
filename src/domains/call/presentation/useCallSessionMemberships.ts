/*
Copyright 2025 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { useCallback, useSyncExternalStore } from "react";

import { type CallMemberSession } from "../domain/CallMemberSession.ts";
import { type CallSessionViewPort } from "../application/ports/CallSessionViewPort.ts";

export function useCallSessionMemberships(
  callSession: CallSessionViewPort,
): CallMemberSession[] {
  const subscribe = useCallback(
    (onChange: () => void) =>
      callSession.subscribeToMembershipsChanged(() => onChange()),
    [callSession],
  );
  const getSnapshot = useCallback(
    () => callSession.getCallMemberSessions(),
    [callSession],
  );

  return useSyncExternalStore(subscribe, getSnapshot);
}
