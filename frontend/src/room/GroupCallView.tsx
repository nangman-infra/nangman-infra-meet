/*
Copyright 2022-2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import {
  type FC,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { type MatrixClient, JoinRule, type Room } from "matrix-js-sdk";
import {
  Room as LivekitRoom,
  isE2EESupported as isE2EESupportedBrowser,
} from "livekit-client";
import { logger } from "matrix-js-sdk/lib/logger";
import { type MatrixRTCSession } from "matrix-js-sdk/lib/matrixrtc";
import { useNavigate } from "react-router-dom";

import {
  ElementWidgetActions,
  type JoinCallData,
} from "../domains/widget/application/ports/WidgetHostPort.ts";
import {
  replyToWidgetAction,
  subscribeToWidgetAction,
} from "../domains/widget/application/services/WidgetActionService.ts";
import {
  closeWidget,
  hasWidgetHost,
  setWidgetAlwaysOnScreen,
} from "../domains/widget/application/services/WidgetHostService.ts";
import { LobbyView } from "./LobbyView";
import { type MatrixInfo } from "./VideoPreview";
import { CallEndedView } from "./CallEndedView";
import { PosthogAnalytics } from "../analytics/PosthogAnalytics";
import { useProfile } from "../profile/useProfile";
import { findDeviceByName } from "../utils/media";
import { ActiveCall } from "./InCallView";
import { type MuteStates } from "../state/MuteStates";
import { useMediaDevices } from "../MediaDevicesContext";
import {
  saveKeyForRoom,
  useRoomEncryptionSystem,
} from "../e2ee/sharedKeyManagement";
import { useRoomAvatar } from "./useRoomAvatar";
import { useRoomName } from "./useRoomName";
import { useJoinRule } from "./useJoinRule";
import { InviteModal } from "./InviteModal";
import { HeaderStyle, type UrlParams } from "../UrlParams";
import { useCallUrlContext } from "../domains/call/application/readModels/CallUrlContext.ts";
import { E2eeType } from "../e2ee/e2eeType";
import { useAudioContext } from "../useAudioContext";
import {
  callEventAudioSounds,
  type CallEventSounds,
} from "./CallEventAudioRenderer";
import { useLatest } from "../useLatest";
import { usePageTitle } from "../usePageTitle";
import { fireAndForget } from "../utils/fireAndForget";
import {
  ConnectionLostError,
  E2EENotSupportedError,
  ElementCallError,
  UnknownCallError,
} from "../utils/errors.ts";
import { GroupCallErrorBoundary } from "./GroupCallErrorBoundary.tsx";
import { muteAllAudio$ } from "../state/MuteAllAudioModel.ts";
import { useAppBarTitle } from "../AppBar.tsx";
import { useBehavior } from "../useBehavior.ts";
import { createMatrixCallSessionViewPort } from "../domains/call/infrastructure/MatrixCallSessionViewPort.ts";
import { useCallSessionMemberships } from "../domains/call/presentation/useCallSessionMemberships.ts";

/**
 * If there already are this many participants in the call, we automatically mute
 * the user.
 */
export const MUTE_PARTICIPANT_COUNT = 8;

declare global {
  interface Window {
    rtcSession?: MatrixRTCSession;
  }
}

interface Props {
  client: MatrixClient;
  isPasswordlessUser: boolean;
  confineToRoom: boolean;
  preload: UrlParams["preload"];
  skipLobby: UrlParams["skipLobby"];
  header: HeaderStyle;
  rtcSession: MatrixRTCSession;
  joined: boolean;
  setJoined: (value: boolean) => void;
  muteStates: MuteStates;
}

export const GroupCallView: FC<Props> = ({
  client,
  isPasswordlessUser,
  confineToRoom,
  preload,
  skipLobby,
  header,
  rtcSession,
  joined,
  setJoined,
  muteStates,
}) => {
  const widgetMode = hasWidgetHost();
  const room = rtcSession.room as Room;
  const callSession = useMemo(
    () => createMatrixCallSessionViewPort(rtcSession),
    [rtcSession],
  );
  // Used to thread through any errors that occur outside the error boundary
  const [externalError, setExternalError] = useState<ElementCallError | null>(
    null,
  );
  const memberships = useCallSessionMemberships(callSession);

  const muteAllAudio = useBehavior(muteAllAudio$);
  const leaveSoundContext = useLatest(
    useAudioContext({
      sounds: callEventAudioSounds,
      latencyHint: "interactive",
      muted: muteAllAudio,
    }),
  );
  // This should use `useEffectEvent` (only available in experimental versions)
  useEffect(() => {
    if (memberships.length >= MUTE_PARTICIPANT_COUNT)
      muteStates.audio.setEnabled$.value?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // This CSS is the only way we could find to not make element call scroll for
  // viewport sizes smaller than 122px width. (It is actually this exact number: 122px
  // tested on different devices...)
  useEffect(() => {
    document.body.classList.add("no-scroll-body");
    return (): void => {
      document.body.classList.remove("no-scroll-body");
    };
  }, []);

  useEffect(() => {
    window.rtcSession = rtcSession;
    return (): void => {
      delete window.rtcSession;
    };
  }, [rtcSession]);

  useEffect(
    () =>
      callSession.subscribeToMembershipManagerError(() =>
        setExternalError(new ConnectionLostError()),
      ),
    [callSession],
  );
  useEffect(() => {
    // Sanity check the room object
    if (client.getRoom(room.roomId) !== room)
      logger.warn(
        `We've ended up with multiple rooms for the same ID (${room.roomId}). This indicates a bug in the group call loading code, and may lead to incomplete room state.`,
      );
  }, [client, room]);
  const { displayName, avatarUrl } = useProfile(client);
  const roomName = useRoomName(room);
  const roomAvatar = useRoomAvatar(room);
  const {
    perParticipantE2EE,
    returnToLobby,
    password: passwordFromUrl,
  } = useCallUrlContext();
  const e2eeSystem = useRoomEncryptionSystem(room.roomId);

  // Save the password once we start the groupCallView
  useEffect(() => {
    if (passwordFromUrl) saveKeyForRoom(room.roomId, passwordFromUrl);
  }, [passwordFromUrl, room.roomId]);

  usePageTitle(roomName);
  useAppBarTitle(roomName);

  const matrixInfo = useMemo((): MatrixInfo => {
    return {
      userId: client.getUserId()!,
      displayName: displayName!,
      avatarUrl: avatarUrl!,
      roomId: room.roomId,
      roomName,
      roomAlias: room.getCanonicalAlias(),
      roomAvatar,
      e2eeSystem,
    };
  }, [client, displayName, avatarUrl, roomName, room, roomAvatar, e2eeSystem]);

  // Count each member only once, regardless of how many devices they use
  const participantCount = useMemo(
    () => new Set<string>(memberships.map((m) => m.userId!)).size,
    [memberships],
  );

  const mediaDevices = useMediaDevices();
  const latestMuteStates = useLatest(muteStates);

  const enterRTCSessionOrError = useCallback(
    async (rtcSession: MatrixRTCSession): Promise<void> => {
      try {
        setJoined(true);
        // TODO-MULTI-SFU what to do with error handling now that we don't use this function?
        // @BillCarsonFr
      } catch (e) {
        if (e instanceof ElementCallError) {
          setExternalError(e);
        } else {
          logger.error(`Unknown Error while entering RTC session`, e);
          const error = new UnknownCallError(
            e instanceof Error ? e : new Error("Unknown error", { cause: e }),
          );
          setExternalError(error);
        }
      }
      return Promise.resolve();
    },
    [setJoined],
  );

  useEffect(() => {
    const defaultDeviceSetup = async ({
      audioInput,
      videoInput,
    }: JoinCallData): Promise<void> => {
      // XXX: I think this is broken currently - LiveKit *won't* request
      // permissions and give you device names unless you specify a kind, but
      // here we want all kinds of devices. This needs a fix in livekit-client
      // for the following name-matching logic to do anything useful.
      const devices = await LivekitRoom.getLocalDevices(undefined, true);

      if (audioInput) {
        const deviceId = findDeviceByName(audioInput, "audioinput", devices);
        if (!deviceId) {
          logger.warn("Unknown audio input: " + audioInput);
          // override the default mute state
          latestMuteStates.current!.audio.setEnabled$.value?.(false);
        } else {
          logger.debug(
            `Found audio input ID ${deviceId} for name ${audioInput}`,
          );
          mediaDevices.audioInput.select(deviceId);
        }
      }

      if (videoInput) {
        const deviceId = findDeviceByName(videoInput, "videoinput", devices);
        if (!deviceId) {
          logger.warn("Unknown video input: " + videoInput);
          // override the default mute state
          latestMuteStates.current!.video.setEnabled$.value?.(false);
        } else {
          logger.debug(
            `Found video input ID ${deviceId} for name ${videoInput}`,
          );
          mediaDevices.videoInput.select(deviceId);
        }
      }
    };

    if (skipLobby) {
      if (widgetMode && preload) {
        // In preload mode without lobby we wait for a join action before entering
        const onJoin = (ev: CustomEvent): void => {
          (async (): Promise<void> => {
            await defaultDeviceSetup(ev.detail.data as unknown as JoinCallData);
            setJoined(true);
            replyToWidgetAction(ev.detail, {});
          })().catch((e) => {
            logger.error("Error joining RTC session on preload", e);
          });
        };
        const unsubscribe = subscribeToWidgetAction(
          ElementWidgetActions.JoinCall,
          onJoin,
        );
        return (): void => {
          unsubscribe?.();
        };
      } else {
        // No lobby and no preload: we enter the rtc session right away
        setJoined(true);
      }
    }
  }, [
    rtcSession,
    preload,
    skipLobby,
    perParticipantE2EE,
    mediaDevices,
    latestMuteStates,
    setJoined,
    widgetMode,
  ]);

  // TODO refactor this + "joined" to just one callState
  const [left, setLeft] = useState(false);

  const navigate = useNavigate();

  const onLeft = useCallback(
    (
      reason: "timeout" | "user" | "allOthersLeft" | "decline" | "error",
    ): void => {
      let playSound: CallEventSounds = "left";
      if (reason === "timeout" || reason === "decline") playSound = reason;

      setJoined(false);
      setLeft(true);
      const audioPromise = leaveSoundContext.current?.playSound(playSound);
      // We need to wait until the callEnded event is tracked on PostHog,
      // otherwise the iframe may get killed first.
      const posthogRequest = new Promise((resolve) => {
        // To increase the likelihood of the PostHog event being sent out in
        // widget mode before the iframe is killed, we ask it to skip the
        // usual queuing/batching of requests.
        const sendInstantly = widgetMode;
        PosthogAnalytics.instance.eventCallEnded.track(
          room.roomId,
          callSession.getCallMemberSessions().length,
          sendInstantly,
          callSession.getCallSessionStats(),
        );
        // Unfortunately the PostHog library provides no way to await the
        // tracking of an event, but we don't really want it to hold up the
        // closing of the widget that long anyway, so giving it 10 ms will do.
        window.setTimeout(resolve, 10);
      });

      fireAndForget(
        Promise.all([audioPromise, posthogRequest])
          .catch((e) =>
            logger.error(
              "Failed to play leave audio and/or send PostHog leave event",
              e,
            ),
          )
          .then(async () => {
            if (
              !isPasswordlessUser &&
              !confineToRoom &&
              !PosthogAnalytics.instance.isEnabled()
            )
              fireAndForget(
                navigate("/"),
                "Failed to navigate home after leaving call",
              );

            if (widgetMode) {
              // After this point the iframe could die at any moment!
              try {
                await setWidgetAlwaysOnScreen(false);
              } catch (e) {
                logger.error(
                  "Failed to set call widget `alwaysOnScreen` to false",
                  e,
                );
              }
              // On a normal user hangup we can shut down and close the widget. But if an
              // error occurs we should keep the widget open until the user reads it.
              if (reason != "error" && !returnToLobby) {
                try {
                  await closeWidget();
                } catch (e) {
                  logger.error("Failed to close widget", e);
                }
              }
            }
          }),
        "Failed to complete call leave flow",
      );
    },
    [
      setJoined,
      leaveSoundContext,
      room.roomId,
      callSession,
      isPasswordlessUser,
      confineToRoom,
      navigate,
      widgetMode,
      returnToLobby,
    ],
  );

  useEffect(() => {
    if (widgetMode && joined)
      // set widget to sticky once joined.
      setWidgetAlwaysOnScreen(true).catch((e) => {
        logger.error("Error calling setAlwaysOnScreen(true)", e);
      });
  }, [widgetMode, joined, rtcSession]);

  const joinRule = useJoinRule(room);

  const [shareModalOpen, setInviteModalOpen] = useState(false);
  const onDismissInviteModal = useCallback(
    () => setInviteModalOpen(false),
    [setInviteModalOpen],
  );

  const onShareClickFn = useCallback(
    () => setInviteModalOpen(true),
    [setInviteModalOpen],
  );
  const onShareClick = joinRule === JoinRule.Public ? onShareClickFn : null;

  if (!isE2EESupportedBrowser() && e2eeSystem.kind !== E2eeType.NONE) {
    // If we have a encryption system but the browser does not support it.
    throw new E2EENotSupportedError();
  }

  const shareModal = (
    <InviteModal
      room={room}
      open={shareModalOpen}
      onDismiss={onDismissInviteModal}
    />
  );
  const lobbyView = (
    <>
      {shareModal}
      <LobbyView
        client={client}
        matrixInfo={matrixInfo}
        muteStates={muteStates}
        onEnter={() => setJoined(true)}
        confineToRoom={confineToRoom}
        hideHeader={header === HeaderStyle.None}
        participantCount={participantCount}
        onShareClick={onShareClick}
      />
    </>
  );

  let body: ReactNode;
  if (externalError) {
    // If an error was recorded within this component but outside
    // GroupCallErrorBoundary, create a component that rethrows the error from
    // within the error boundary, so it can be handled uniformly
    const ErrorComponent = (): ReactNode => {
      throw externalError;
    };
    body = <ErrorComponent />;
  } else if (joined) {
    body = (
      <>
        {shareModal}
        <ActiveCall
          client={client}
          matrixInfo={matrixInfo}
          rtcSession={rtcSession}
          matrixRoom={room}
          onLeft={onLeft}
          header={header}
          muteStates={muteStates}
          e2eeSystem={e2eeSystem}
          //otelGroupCallMembership={otelGroupCallMembership}
          onShareClick={onShareClick}
        />
      </>
    );
  } else if (left && !widgetMode) {
    // Left in SPA mode:

    // The call ended view is shown for two reasons: prompting guests to create
    // an account, and prompting users that have opted into analytics to provide
    // feedback. We don't show a feedback prompt to widget users however (at
    // least for now), because we don't yet have designs that would allow widget
    // users to dismiss the feedback prompt and close the call window without
    // submitting anything.
    if (
      isPasswordlessUser ||
      (PosthogAnalytics.instance.isEnabled() && !widgetMode)
    ) {
      body = (
        <CallEndedView
          endedCallId={rtcSession.room.roomId}
          client={client}
          isPasswordlessUser={isPasswordlessUser}
          hideHeader={header === HeaderStyle.None}
          confineToRoom={confineToRoom}
        />
      );
    } else {
      // If the user is a regular user, we'll have sent them back to the homepage,
      // so just sit here & do nothing: otherwise we would (briefly) mount the
      // LobbyView again which would open capture devices again.
      body = null;
    }
  } else if (left && widgetMode) {
    // Left in widget mode:
    body = returnToLobby ? lobbyView : null;
  } else if (preload || skipLobby) {
    // The RTC session is not joined to yet (`isJoined`), but enterRTCSessionOrError should have been called.
    body = null;
  } else {
    body = lobbyView;
  }

  return (
    <GroupCallErrorBoundary
      recoveryActionHandler={async (action) => {
        setExternalError(null);
        if (action == "reconnect") {
          setLeft(false);
          await enterRTCSessionOrError(rtcSession).catch((e) => {
            logger.error("Error re-entering RTC session", e);
          });
        }
      }}
      onError={
        (/**error*/) => {
          if (callSession.isJoined()) onLeft("error");
        }
      }
    >
      {body}
    </GroupCallErrorBoundary>
  );
};
