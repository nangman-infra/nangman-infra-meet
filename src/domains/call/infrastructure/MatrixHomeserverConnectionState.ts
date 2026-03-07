/*
Copyright 2025 Element Creations Ltd.
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { ClientEvent, type MatrixClient, SyncState } from "matrix-js-sdk";
import {
  MembershipManagerEvent,
  Status,
  type MatrixRTCSession,
} from "matrix-js-sdk/lib/matrixrtc";
import { fromEventPattern, map, startWith, type Observable } from "rxjs";
import { logger as rootLogger } from "matrix-js-sdk/lib/logger";

import { createHomeserverConnected$ } from "../application/services/createHomeserverConnected.ts";
import { type ObservableScope } from "../../../state/ObservableScope";

interface NodeStyleEventEmitter {
  addListener?(
    eventName: string | symbol,
    handler: (...args: unknown[]) => void,
  ): unknown;
  removeListener?(
    eventName: string | symbol,
    handler: (...args: unknown[]) => void,
  ): unknown;
  on?(eventName: string | symbol, handler: (...args: unknown[]) => void): unknown;
  off?(
    eventName: string | symbol,
    handler: (...args: unknown[]) => void,
  ): unknown;
}

type MatrixSyncClientPort = NodeStyleEventEmitter &
  Pick<MatrixClient, "getSyncState">;
type MatrixMembershipManagerPort = NodeStyleEventEmitter &
  Pick<MatrixRTCSession, "membershipStatus" | "probablyLeft">;

const logger = rootLogger.getChild("[HomeserverConnected]");

function attachListener(
  emitter: NodeStyleEventEmitter,
  eventName: string | symbol,
  handler: (...args: unknown[]) => void,
): void {
  if (emitter.addListener) {
    emitter.addListener(eventName, handler);
    return;
  }
  emitter.on?.(eventName, handler);
}

function detachListener(
  emitter: NodeStyleEventEmitter,
  eventName: string | symbol,
  handler: (...args: unknown[]) => void,
): void {
  if (emitter.removeListener) {
    emitter.removeListener(eventName, handler);
    return;
  }
  emitter.off?.(eventName, handler);
}

export function createMatrixSyncing$(
  client: MatrixSyncClientPort,
): Observable<boolean> {
  return fromEventPattern<[SyncState]>(
    (handler) => attachListener(client, ClientEvent.Sync, handler),
    (handler) => detachListener(client, ClientEvent.Sync, handler),
  ).pipe(
    startWith([client.getSyncState()]),
    map(([state]) => state === SyncState.Syncing),
  );
}

export function createMatrixMembershipConnected$(
  matrixRTCSession: MatrixMembershipManagerPort,
): Observable<boolean> {
  return fromEventPattern(
    (handler) =>
      attachListener(
        matrixRTCSession,
        MembershipManagerEvent.StatusChanged,
        handler,
      ),
    (handler) =>
      detachListener(
        matrixRTCSession,
        MembershipManagerEvent.StatusChanged,
        handler,
      ),
  ).pipe(
    startWith(null),
    map(() => matrixRTCSession.membershipStatus === Status.Connected),
  );
}

export function createMatrixCertainlyConnected$(
  matrixRTCSession: MatrixMembershipManagerPort,
): Observable<boolean> {
  return fromEventPattern(
    (handler) =>
      attachListener(
        matrixRTCSession,
        MembershipManagerEvent.ProbablyLeft,
        handler,
      ),
    (handler) =>
      detachListener(
        matrixRTCSession,
        MembershipManagerEvent.ProbablyLeft,
        handler,
      ),
  ).pipe(
    startWith(null),
    map(() => matrixRTCSession.probablyLeft !== true),
  );
}

export function createMatrixHomeserverConnected$(
  scope: ObservableScope,
  client: MatrixSyncClientPort,
  matrixRTCSession: MatrixMembershipManagerPort,
): ReturnType<typeof createHomeserverConnected$> {
  const homeserverConnected$ = createHomeserverConnected$(
    scope,
    createMatrixSyncing$(client),
    createMatrixMembershipConnected$(matrixRTCSession),
    createMatrixCertainlyConnected$(matrixRTCSession),
  );

  homeserverConnected$.pipe(scope.bind()).subscribe((connected) => {
    logger.info(`Homeserver connected update: ${connected}`);
  });

  return homeserverConnected$;
}
