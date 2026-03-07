/*
Copyright 2025 Element Creations Ltd.
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type ParticipantId } from "matrix-js-sdk/lib/matrixrtc";
import { BehaviorSubject, combineLatest, map, of, switchMap, tap } from "rxjs";
import { type Logger } from "matrix-js-sdk/lib/logger";
import { type LocalParticipant, type RemoteParticipant } from "livekit-client";

import { type Behavior } from "../../Behavior.ts";
import { type Connection } from "./Connection.ts";
import { Epoch, type ObservableScope } from "../../ObservableScope.ts";
import { generateItemsWithEpoch } from "../../../utils/observable.ts";
import { type ConnectionFactory } from "./ConnectionFactory.ts";
import {
  areCallTransportsEqual,
  getCallTransportKey,
  type CallTransport,
} from "../../../domains/call/domain/CallTransport.ts";

export class ConnectionManagerData {
  private readonly store: Map<
    string,
    [Connection, (LocalParticipant | RemoteParticipant)[]]
  > = new Map();

  public constructor() {}

  public add(
    connection: Connection,
    participants: (LocalParticipant | RemoteParticipant)[],
  ): void {
    const key = this.getKey(connection.transport);
    const existing = this.store.get(key);
    if (!existing) {
      this.store.set(key, [connection, participants]);
    } else {
      existing[1].push(...participants);
    }
  }

  private getKey(transport: CallTransport): string {
    return getCallTransportKey(transport);
  }

  public getConnections(): Connection[] {
    return Array.from(this.store.values()).map(([connection]) => connection);
  }

  public getConnectionForTransport(
    transport: CallTransport,
  ): Connection | null {
    return this.store.get(this.getKey(transport))?.[0] ?? null;
  }

  public getParticipantForTransport(
    transport: CallTransport,
  ): (LocalParticipant | RemoteParticipant)[] {
    const key = getCallTransportKey(transport);
    const existing = this.store.get(key);
    if (existing) {
      return existing[1];
    }
    return [];
  }
  /**
   * Get all connections where the given participant is publishing.
   * In theory, there could be several connections where the same participant is publishing but with
   * only well behaving clients a participant should only be publishing on a single connection.
   * @param participantId
   */
  public getConnectionsForParticipant(
    participantId: ParticipantId,
  ): Connection[] {
    const connections: Connection[] = [];
    for (const [connection, participants] of this.store.values()) {
      if (participants.some((p) => p.identity === participantId)) {
        connections.push(connection);
      }
    }
    return connections;
  }
}
interface Props {
  scope: ObservableScope;
  connectionFactory: ConnectionFactory;
  inputTransports$: Behavior<Epoch<CallTransport[]>>;
  logger: Logger;
}
// TODO - write test for scopes (do we really need to bind scope)
export interface IConnectionManager {
  transports$: Behavior<Epoch<CallTransport[]>>;
  connectionManagerData$: Behavior<Epoch<ConnectionManagerData>>;
}
/**
 * Crete a `ConnectionManager`
 * @param scope the observable scope used by this object.
 * @param connectionFactory used to create new connections.
 * @param _transportsSubscriptions$ A list of Behaviors each containing a LIST of LivekitTransport.
 *   Each of these behaviors can be interpreted as subscribed list of transports.
 *
 *   Using `registerTransports` independent external modules can control what connections
 *   are created by the ConnectionManager.
 *
 *   The connection manager will remove all duplicate transports in each subscibed list.
 *
 *   See `unregisterAllTransports` and `unregisterTransport` for details on how to unsubscribe.
 */
export function createConnectionManager$({
  scope,
  connectionFactory,
  inputTransports$,
  logger: parentLogger,
}: Props): IConnectionManager {
  const logger = parentLogger.getChild("[ConnectionManager]");

  const running$ = new BehaviorSubject(true);
  scope.onEnd(() => running$.next(false));
  // TODO logger: only construct one logger from the client and make it compatible via a EC specific sing

  /**
   * All transports currently managed by the ConnectionManager.
   *
   * This list does not include duplicate transports.
   *
   * It is build based on the list of subscribed transports (`transportsSubscriptions$`).
   * externally this is modified via `registerTransports()`.
   */
  const transports$ = scope.behavior(
    combineLatest([running$, inputTransports$]).pipe(
      map(([running, transports]) =>
        transports.mapInner((transport) => (running ? transport : [])),
      ),
      map((transports) => transports.mapInner(removeDuplicateTransports)),
      tap(({ value: transports }) => {
        logger.trace(
          `Managing transports: ${transports.map((t) => t.serviceUrl).join(", ")}`,
        );
      }),
    ),
  );

  /**
   * Connections for each transport in use by one or more session members.
   */
  const connections$ = scope.behavior(
    transports$.pipe(
      generateItemsWithEpoch(
        function* (transports) {
          for (const transport of transports)
            yield {
              keys: [transport.serviceUrl, transport.roomAlias],
              data: undefined,
            };
        },
        (scope, _data$, serviceUrl, roomAlias) => {
          logger.debug(`Creating connection to ${serviceUrl} (${roomAlias})`);
          const connection = connectionFactory.createConnection(
            { kind: "livekit", serviceUrl, roomAlias },
            scope,
            logger,
          );
          // Start the connection immediately
          // Use connection state to track connection progress
          void connection.start();
          // TODO subscribe to connection state to retry or log issues?
          return connection;
        },
      ),
    ),
  );

  const connectionManagerData$ = scope.behavior(
    connections$.pipe(
      switchMap((connections) => {
        const epoch = connections.epoch;

        // Map the connections to list of {connection, participants}[]
        const listOfConnectionsWithPublishingParticipants =
          connections.value.map((connection) => {
            return connection.remoteParticipantsWithTracks$.pipe(
              map((participants) => ({
                connection,
                participants,
              })),
            );
          });

        // probably not required
        if (listOfConnectionsWithPublishingParticipants.length === 0) {
          return of(new Epoch(new ConnectionManagerData(), epoch));
        }

        // combineLatest the several streams into a single stream with the ConnectionManagerData
        return combineLatest(listOfConnectionsWithPublishingParticipants).pipe(
          map(
            (lists) =>
              new Epoch(
                lists.reduce((data, { connection, participants }) => {
                  data.add(connection, participants);
                  return data;
                }, new ConnectionManagerData()),
                epoch,
              ),
          ),
        );
      }),
    ),
    new Epoch(new ConnectionManagerData()),
  );

  return { transports$, connectionManagerData$ };
}

function removeDuplicateTransports(
  transports: CallTransport[],
): CallTransport[] {
  return transports.reduce((acc, transport) => {
    if (!acc.some((t) => areCallTransportsEqual(t, transport)))
      acc.push(transport);
    return acc;
  }, [] as CallTransport[]);
}
