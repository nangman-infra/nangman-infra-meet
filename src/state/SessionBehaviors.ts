/*
Copyright 2025 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type CallTransport } from "../domains/call/domain/CallTransport.ts";
import { type CallMemberTransportBinding } from "../domains/call/domain/CallMemberTransportBinding.ts";
import { type Behavior } from "./Behavior";
import { mapEpoch, type Epoch, type ObservableScope } from "./ObservableScope";

export const membershipsAndTransports$ = (
  scope: ObservableScope,
  membershipsWithTransport$: Behavior<Epoch<CallMemberTransportBinding[]>>,
): {
  membershipsWithTransport$: Behavior<Epoch<CallMemberTransportBinding[]>>;
  transports$: Behavior<Epoch<CallTransport[]>>;
} => {
  /**
   * Lists the transports used by ourselves, plus all other MatrixRTC session
   * members. For completeness this also lists the preferred transport and
   * whether we are in multi-SFU mode or sticky events mode (because
   * advertisedTransport$ wants to read them at the same time, and bundling data
   * together when it might change together is what you have to do in RxJS to
   * avoid reading inconsistent state or observing too many changes.)
   */
  const transports$ = scope.behavior(
    membershipsWithTransport$.pipe(
      mapEpoch((mts) => mts.flatMap(({ transport: t }) => (t ? [t] : []))),
    ),
  );

  return {
    membershipsWithTransport$,
    transports$,
  };
};
