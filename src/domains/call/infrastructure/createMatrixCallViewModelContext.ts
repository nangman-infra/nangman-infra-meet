/*
Copyright 2025 Element Creations Ltd.
Copyright 2023, 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { ExternalE2EEKeyProvider } from "livekit-client";
import { type MatrixClient } from "matrix-js-sdk";
import { type MatrixRTCSession } from "matrix-js-sdk/lib/matrixrtc";
import { logger } from "matrix-js-sdk/lib/logger";

import { type EncryptionSystem } from "../../../e2ee/sharedKeyManagement.ts";
import { E2eeType } from "../../../e2ee/e2eeType.ts";
import { MatrixKeyProvider } from "../../../e2ee/matrixKeyProvider.ts";
import { type ObservableScope } from "../../../state/ObservableScope.ts";
import { membershipsAndTransports$ } from "../../../state/SessionBehaviors.ts";
import { type CallViewModelSessionContext } from "../application/ports/CallViewModelSessionPort.ts";
import { createMatrixCallMemberTransportBindings$ } from "./MatrixCallMemberTransportBindings.ts";
import { createMatrixHomeserverConnected$ } from "./MatrixHomeserverConnectionState.ts";
import { createSentCallNotification$ } from "./MatrixCallNotificationEventSource.ts";
import { enterRTCSession } from "./MatrixCallSessionMembership.ts";
import { toLivekitTransport } from "./LivekitCallTransportAdapter.ts";

interface CreateMatrixCallViewModelContextOptions {
  scope: ObservableScope;
  rtcSession: MatrixRTCSession;
  client: MatrixClient;
  encryptionSystem: EncryptionSystem;
}

function createCallConnectionEncryption(
  e2eeSystem: EncryptionSystem,
  rtcSession: MatrixRTCSession,
): CallViewModelSessionContext["connectionEncryption"] {
  if (e2eeSystem.kind === E2eeType.NONE) return undefined;

  if (e2eeSystem.kind === E2eeType.PER_PARTICIPANT) {
    const keyProvider = new MatrixKeyProvider();
    keyProvider.setRTCSession(rtcSession);
    return {
      enabled: true,
      keyProvider,
    };
  }

  if (e2eeSystem.kind === E2eeType.SHARED_KEY && e2eeSystem.secret) {
    const keyProvider = new ExternalE2EEKeyProvider();
    keyProvider
      .setKey(e2eeSystem.secret)
      .catch((e) => logger.error("Failed to set shared key for E2EE", e));
    return {
      enabled: true,
      keyProvider,
    };
  }
}

export function createMatrixCallViewModelContext({
  scope,
  rtcSession,
  client,
  encryptionSystem,
}: CreateMatrixCallViewModelContextOptions): CallViewModelSessionContext {
  const membershipsAndTransports = membershipsAndTransports$(
    scope,
    createMatrixCallMemberTransportBindings$(scope, rtcSession),
  );

  return {
    membershipsAndTransports,
    homeserverConnected$: createMatrixHomeserverConnected$(
      scope,
      client,
      rtcSession,
    ),
    sentCallNotification$: createSentCallNotification$(scope, rtcSession),
    connectionEncryption: createCallConnectionEncryption(
      encryptionSystem,
      rtcSession,
    ),
    callSessionMembership: rtcSession,
    joinCallSession: async (transport, options) =>
      await enterRTCSession(rtcSession, toLivekitTransport(transport), options),
  };
}
