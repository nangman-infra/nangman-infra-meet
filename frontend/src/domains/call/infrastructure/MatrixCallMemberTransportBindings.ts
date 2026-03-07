/*
Copyright 2025 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import {
  type CallMembership,
  isLivekitTransport,
  type MatrixRTCSession,
  MatrixRTCSessionEvent,
} from "matrix-js-sdk/lib/matrixrtc";
import { fromEvent } from "rxjs";

import { type Behavior } from "../../../state/Behavior";
import {
  Epoch,
  mapEpoch,
  trackEpoch,
  type ObservableScope,
} from "../../../state/ObservableScope";
import { type CallMemberTransportBinding } from "../domain/CallMemberTransportBinding.ts";
import { toCallMember } from "../domain/CallMember.ts";
import { fromLivekitTransport } from "./LivekitCallTransportAdapter.ts";

export function fromMatrixCallMemberships(
  memberships: CallMembership[],
): CallMemberTransportBinding[] {
  return memberships.map((membership) => {
    const oldestMembership = memberships[0] ?? membership;
    const transport = membership.getTransport(oldestMembership);
    return {
      member: toCallMember(membership),
      transport: isLivekitTransport(transport)
        ? fromLivekitTransport(transport)
        : undefined,
    };
  });
}

export function createMatrixCallMemberTransportBindings$(
  scope: ObservableScope,
  matrixRTCSession: MatrixRTCSession,
): Behavior<Epoch<CallMemberTransportBinding[]>> {
  return scope.behavior(
    fromEvent(
      matrixRTCSession,
      MatrixRTCSessionEvent.MembershipsChanged,
      (_, memberships: CallMembership[]) => memberships,
    ).pipe(trackEpoch(), mapEpoch(fromMatrixCallMemberships)),
    new Epoch(fromMatrixCallMemberships(matrixRTCSession.memberships)),
  );
}
