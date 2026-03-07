/*
Copyright 2025 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { Config } from "../../../config/Config.ts";
import { PosthogAnalytics } from "../../../analytics/PosthogAnalytics.ts";
import { ElementWidgetActions } from "../../widget/application/ports/WidgetHostPort.ts";
import { sendWidgetAction } from "../../widget/application/services/WidgetActionService.ts";
import { MatrixRTCMode } from "../../../settings/settings.ts";
import { getCallUrlContext } from "../application/readModels/CallUrlContext.ts";
import { type CallFocusTransportPort, type JoinableCallSessionPort } from "../application/ports/CallSessionPort.ts";

interface EnterRTCSessionOptions {
  encryptMedia: boolean;
  matrixRTCMode: MatrixRTCMode;
}

export async function enterRTCSession(
  rtcSession: JoinableCallSessionPort,
  transport: CallFocusTransportPort,
  { encryptMedia, matrixRTCMode }: EnterRTCSessionOptions,
): Promise<void> {
  PosthogAnalytics.instance.eventCallEnded.cacheStartCall(new Date());
  PosthogAnalytics.instance.eventCallStarted.track(rtcSession.room.roomId);

  const { features, matrix_rtc_session: matrixRtcSessionConfig } = Config.get();
  const useDeviceSessionMemberEvents =
    features?.feature_use_device_session_member_events;
  const { sendNotificationType: notificationType, callIntent } =
    getCallUrlContext();
  const multiSFU = matrixRTCMode !== MatrixRTCMode.Legacy;

  await rtcSession.joinRoomSession(
    multiSFU ? [] : [transport],
    multiSFU ? transport : undefined,
    {
      notificationType,
      callIntent,
      manageMediaKeys: encryptMedia,
      ...(useDeviceSessionMemberEvents !== undefined && {
        useLegacyMemberEvents: !useDeviceSessionMemberEvents,
      }),
      delayedLeaveEventRestartMs:
        matrixRtcSessionConfig?.delayed_leave_event_restart_ms,
      delayedLeaveEventDelayMs:
        matrixRtcSessionConfig?.delayed_leave_event_delay_ms,
      delayedLeaveEventRestartLocalTimeoutMs:
        matrixRtcSessionConfig?.delayed_leave_event_restart_local_timeout_ms,
      networkErrorRetryMs: matrixRtcSessionConfig?.network_error_retry_ms,
      makeKeyDelay: matrixRtcSessionConfig?.wait_for_key_rotation_ms,
      membershipEventExpiryMs:
        matrixRtcSessionConfig?.membership_event_expiry_ms,
      useExperimentalToDeviceTransport: true,
      unstableSendStickyEvents: matrixRTCMode === MatrixRTCMode.Matrix_2_0,
    },
  );
  await sendWidgetAction(ElementWidgetActions.JoinCall, {});
}
