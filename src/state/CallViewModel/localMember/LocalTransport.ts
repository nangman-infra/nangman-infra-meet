/*
Copyright 2025 Element Creations Ltd.

SPDX-License-IdFentifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type MatrixClient } from "matrix-js-sdk";
import {
  combineLatest,
  distinctUntilChanged,
  first,
  from,
  map,
  switchMap,
} from "rxjs";
import { logger as rootLogger } from "matrix-js-sdk/lib/logger";

import { type Behavior } from "../../Behavior.ts";
import { type Epoch, type ObservableScope } from "../../ObservableScope.ts";
import { MatrixRTCTransportMissingError } from "../../../utils/errors.ts";
import { type OpenIDClientParts } from "../../../livekit/openIDSFU.ts";
import { customLivekitUrl } from "../../../settings/settings.ts";
import { type CallMember } from "../../../domains/call/domain/CallMember.ts";
import { type CallSfuConfigPort } from "../../../domains/call/application/ports/CallSfuConfigPort.ts";
import { type CallTransportDiscoveryPort } from "../../../domains/call/application/ports/CallTransportDiscoveryPort.ts";
import { selectPreferredCallTransport } from "../../../domains/call/application/services/selectPreferredCallTransport.ts";
import {
  areCallTransportsEqual,
  type CallTransport,
} from "../../../domains/call/domain/CallTransport.ts";
import { MatrixCallTransportDiscovery } from "../../../domains/call/infrastructure/MatrixCallTransportDiscovery.ts";
import { OpenIdCallSfuConfigAdapter } from "../../../domains/call/infrastructure/OpenIdCallSfuConfigAdapter.ts";

const logger = rootLogger.getChild("[LocalTransport]");

/*
 * It figures out “which LiveKit focus URL/alias the local user should use,”
 * optionally aligning with the oldest member, and ensures the SFU path is primed
 * before advertising that choice.
 */
interface Props {
  scope: ObservableScope;
  membershipsWithTransport$: Behavior<
    Epoch<{ member: CallMember; transport?: CallTransport }[]>
  >;
  client: Pick<MatrixClient, "getDomain"> & OpenIDClientParts;
  roomId: string;
  useOldestMember$: Behavior<boolean>;
  transportDiscoveryPort?: CallTransportDiscoveryPort;
  sfuConfigPort?: CallSfuConfigPort;
}

/**
 * This class is responsible for managing the local transport.
 * "Which transport is the local member going to use"
 *
 * @prop useOldestMember Whether to use the same transport as the oldest member.
 * This will only update once the first oldest member appears. Will not recompute if the oldest member leaves.
 *
 * @throws MatrixRTCTransportMissingError | FailToGetOpenIdToken
 */
export const createLocalTransport$ = ({
  scope,
  membershipsWithTransport$,
  client,
  roomId,
  useOldestMember$,
  transportDiscoveryPort = new MatrixCallTransportDiscovery(client, logger),
  sfuConfigPort = new OpenIdCallSfuConfigAdapter(client),
}: Props): Behavior<CallTransport | null> => {
  /**
   * The transport over which we should be actively publishing our media.
   * undefined when not joined.
   */
  const oldestMemberTransport$: Behavior<CallTransport | null> =
    scope.behavior(
      membershipsWithTransport$.pipe(
        map((memberships): CallTransport | null => {
          return memberships.value[0]?.transport ?? null;
        }),
        first((transport): transport is CallTransport => transport !== null),
      ),
      null,
    );

  /**
   * The transport that we would personally prefer to publish on (if not for the
   * transport preferences of others, perhaps).
   *
   * @throws
   */
  const preferredTransport$: Behavior<CallTransport | null> = scope.behavior(
    customLivekitUrl.value$.pipe(
      switchMap((customUrl) =>
        from(
          makeTransport(
            client,
            roomId,
            customUrl,
            transportDiscoveryPort,
            sfuConfigPort,
          ),
        ),
      ),
    ),
    null,
  );

  /**
   * The chosen transport we should advertise in our MatrixRTC membership.
   */
  return scope.behavior<CallTransport | null>(
    combineLatest([
      useOldestMember$,
      oldestMemberTransport$,
      preferredTransport$,
    ]).pipe(
      map(
        ([useOldestMember, oldestMemberTransport, preferredTransport]):
          | CallTransport
          | null =>
          useOldestMember
            ? (oldestMemberTransport ?? preferredTransport ?? null)
            : (preferredTransport ?? null),
      ),
      distinctUntilChanged(areCallTransportsEqual),
      map((transport): CallTransport | null => transport ?? null),
    ),
  );
};

/**
 *
 * @param client
 * @param roomId
 * @returns
 * @throws MatrixRTCTransportMissingError | FailToGetOpenIdToken
 */
async function makeTransport(
  client: Pick<MatrixClient, "getDomain"> & OpenIDClientParts,
  roomId: string,
  urlFromDevSettings: string | null,
  transportDiscoveryPort: CallTransportDiscoveryPort,
  sfuConfigPort: CallSfuConfigPort,
): Promise<CallTransport> {
  logger.trace("Searching for a preferred transport");
  const domain = client.getDomain();
  const transport = selectPreferredCallTransport(
    await transportDiscoveryPort.discover({
      roomId,
      customLivekitServiceUrl: urlFromDevSettings,
    }),
  );

  if (!transport) throw new MatrixRTCTransportMissingError(domain ?? ""); // this will call the jwt/sfu/get endpoint to pre create the livekit room.

  await sfuConfigPort.get(transport);

  return transport;
}
