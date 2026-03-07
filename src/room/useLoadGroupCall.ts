/*
Copyright 2022-2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { useEffect, useState } from "react";
import { type MatrixClient } from "matrix-js-sdk";
import { logger } from "matrix-js-sdk/lib/logger";
import { type MatrixRTCSession } from "matrix-js-sdk/lib/matrixrtc";

import {
  loadGroupCall,
  subscribeToRoomTermination,
} from "../domains/room/application/services/loadGroupCall.ts";
import { type RoomSummaryView } from "../domains/room/domain/RoomTypes.ts";
import {
  MatrixRoomLifecycleAdapter,
  toMatrixRoomSession,
} from "../domains/room/infrastructure/MatrixRoomLifecycleAdapter.ts";
import { hasWidgetHost } from "../domains/widget/application/services/WidgetHostService.ts";

export type GroupCallLoaded = {
  kind: "loaded";
  rtcSession: MatrixRTCSession;
};

export type GroupCallLoadFailed = {
  kind: "failed";
  error: Error;
};

export type GroupCallLoading = {
  kind: "loading";
};

export type GroupCallWaitForInvite = {
  kind: "waitForInvite";
  roomSummary: RoomSummaryView;
};

export type GroupCallCanKnock = {
  kind: "canKnock";
  roomSummary: RoomSummaryView;
  knock: () => void;
};

export type GroupCallStatus =
  | GroupCallLoaded
  | GroupCallLoadFailed
  | GroupCallLoading
  | GroupCallWaitForInvite
  | GroupCallCanKnock;

export const useLoadGroupCall = (
  client: MatrixClient | undefined,
  roomIdOrAlias: string | null,
  viaServers: string[],
): GroupCallStatus => {
  const [state, setState] = useState<GroupCallStatus>({ kind: "loading" });
  const viaServersKey = viaServers.join(",");

  useEffect(() => {
    setState({ kind: "loading" });
  }, [client, roomIdOrAlias, viaServersKey]);

  useEffect(() => {
    if (!client || !roomIdOrAlias) return;

    const roomClient = new MatrixRoomLifecycleAdapter(client);
    let disposed = false;
    let unsubscribeTermination: (() => void) | undefined;

    logger.log("Start loading group call");

    void loadGroupCall({
      roomClient,
      roomIdOrAlias,
      viaServers,
      widgetMode: hasWidgetHost(),
      onProgress: (progress) => {
        if (!disposed) setState(progress);
      },
    })
      .then(({ roomId, rtcSession }) => {
        if (disposed) return;

        setState({ kind: "loaded", rtcSession: toMatrixRoomSession(rtcSession) });
        unsubscribeTermination = subscribeToRoomTermination({
          roomClient,
          roomId,
          onTerminated: (error) => {
            if (!disposed) setState({ kind: "failed", error });
          },
        });
      })
      .catch((error) => {
        if (!disposed) setState({ kind: "failed", error });
      });

    return (): void => {
      disposed = true;
      unsubscribeTermination?.();
    };
  }, [client, roomIdOrAlias, viaServers, viaServersKey]);

  return state;
};
