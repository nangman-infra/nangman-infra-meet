/*
Copyright 2025 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import {
  type MatrixRTCSession,
  MatrixRTCSessionEvent,
  type MatrixRTCSessionEventHandlerMap,
} from "matrix-js-sdk/lib/matrixrtc";
import { EventType, type Room as MatrixRoom, RoomEvent } from "matrix-js-sdk";
import { type Observable, fromEvent, filter, map } from "rxjs";

import { type Behavior } from "../../../state/Behavior";
import { type ObservableScope } from "../../../state/ObservableScope";
import {
  type ReceivedCallDecline,
  type SentCallNotification,
} from "../domain/CallNotification.ts";

type MatrixCallNotificationWrapper = Parameters<
  MatrixRTCSessionEventHandlerMap[MatrixRTCSessionEvent.DidSendCallNotification]
>;

export function createSentCallNotification$(
  scope: ObservableScope,
  matrixRTCSession: MatrixRTCSession,
): Behavior<SentCallNotification | null> {
  return scope.behavior(
    (
      fromEvent(
        matrixRTCSession,
        MatrixRTCSessionEvent.DidSendCallNotification,
      ) as Observable<MatrixCallNotificationWrapper>
    ).pipe(
      map(([notificationEvent]) => ({
        eventId: notificationEvent?.event_id,
        notificationType: notificationEvent?.notification_type,
        lifetimeMs: notificationEvent?.lifetime ?? 0,
      })),
    ),
    null,
  );
}

export function createReceivedDecline$(
  matrixRoom: MatrixRoom,
): Observable<ReceivedCallDecline> {
  return (fromEvent(matrixRoom, RoomEvent.Timeline) as Observable<unknown[]>).pipe(
    map(([event]) => event),
    filter(
      (event): event is {
        getType: () => string;
        getRelation: () => { event_id?: string } | undefined;
        getSender: () => string | undefined;
      } => Boolean(event),
    ),
    filter((event) => event.getType() === EventType.RTCDecline),
    map((event) => ({
      relatedEventId: event.getRelation()?.event_id,
      sender: event.getSender(),
    })),
  );
}
