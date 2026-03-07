/*
Copyright 2025 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { type CallIntent, type CallNotificationType } from "../../domain/CallOptions.ts";

export interface CallFocusTransportPort {
  type: "livekit";
  livekit_alias: string;
  livekit_service_url: string;
  [key: string]: unknown;
}

export interface JoinCallSessionOptions {
  notificationType?: CallNotificationType;
  callIntent?: CallIntent;
  manageMediaKeys: boolean;
  useLegacyMemberEvents?: boolean;
  delayedLeaveEventRestartMs?: number;
  delayedLeaveEventDelayMs?: number;
  delayedLeaveEventRestartLocalTimeoutMs?: number;
  networkErrorRetryMs?: number;
  makeKeyDelay?: number;
  membershipEventExpiryMs?: number;
  useExperimentalToDeviceTransport?: boolean;
  unstableSendStickyEvents?: boolean;
}

export interface CallSessionMembershipPort {
  updateCallIntent(intent: CallIntent): Promise<void> | void;
  leaveRoomSession(): Promise<unknown>;
}

export interface JoinableCallSessionPort {
  room: {
    roomId: string;
  };
  joinRoomSession(
    preferredFoci: CallFocusTransportPort[],
    activeFocus: CallFocusTransportPort | undefined,
    options: JoinCallSessionOptions,
  ): Promise<void> | void;
}
