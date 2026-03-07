/*
Copyright 2025 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type MatrixRTCMode } from "../../../../settings/settings.ts";
import { type Behavior } from "../../../../state/Behavior.ts";
import { type Epoch } from "../../../../state/ObservableScope.ts";
import { type CallMemberTransportBinding } from "../../domain/CallMemberTransportBinding.ts";
import { type SentCallNotification } from "../../domain/CallNotification.ts";
import { type CallTransport } from "../../domain/CallTransport.ts";
import { type CallSessionMembershipPort } from "./CallSessionPort.ts";

export interface CallJoinSessionOptions {
  encryptMedia: boolean;
  matrixRTCMode: MatrixRTCMode;
}

export interface CallMembershipTransportStatePort {
  membershipsWithTransport$: Behavior<Epoch<CallMemberTransportBinding[]>>;
  transports$: Behavior<Epoch<CallTransport[]>>;
}

export interface CallConnectionEncryptionPort {
  enabled: boolean;
  keyProvider?: unknown;
}

export interface CallViewModelSessionContext {
  membershipsAndTransports: CallMembershipTransportStatePort;
  homeserverConnected$: Behavior<boolean>;
  sentCallNotification$: Behavior<SentCallNotification | null>;
  connectionEncryption?: CallConnectionEncryptionPort;
  callSessionMembership: CallSessionMembershipPort;
  joinCallSession: (
    transport: CallTransport,
    options: CallJoinSessionOptions,
  ) => Promise<void>;
}
