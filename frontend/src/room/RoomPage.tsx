/*
Copyright 2021-2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import {
  type FC,
  useEffect,
  useState,
  type ReactNode,
  useRef,
  type JSX,
} from "react";
import { Navigate, useLocation } from "react-router-dom";
import { type MatrixError } from "matrix-js-sdk";
import { logger } from "matrix-js-sdk/lib/logger";
import { Trans, useTranslation } from "react-i18next";
import {
  CheckIcon,
  AdminIcon,
  CloseIcon,
  EndCallIcon,
  UnknownSolidIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";
import { Button } from "@vector-im/compound-web";
import { useObservable } from "observable-hooks";
import { map } from "rxjs";

import { useClientLegacy } from "../ClientContext";
import { ErrorPage, FullScreenView, LoadingPage } from "../FullScreenView";
import { GroupCallView } from "./GroupCallView";
import { platform } from "../Platform";
import { AppSelectionModal } from "./AppSelectionModal";
import { useLoadGroupCall } from "./useLoadGroupCall";
import { LobbyView } from "./LobbyView";
import { E2eeType } from "../e2ee/e2eeType";
import { useProfile } from "../profile/useProfile";
import { useOptInAnalytics } from "../settings/settings";
import { Config } from "../config/Config";
import { Link } from "../button/Link";
import { ErrorView } from "../ErrorView";
import { useMediaDevices } from "../MediaDevicesContext";
import { MuteStates } from "../state/MuteStates";
import { ObservableScope } from "../state/ObservableScope";
import { RoomTerminationError } from "../domains/room/application/errors/RoomTerminationError.ts";
import { useMeetingEntryAccess } from "../domains/meetings/presentation/useMeetingEntryAccess";
import { useRoomIdentifier } from "../domains/room/application/readModels/RoomIdentifier.ts";
import { useRoomEntryUrlContext } from "../domains/room/application/readModels/RoomEntryUrlContext.ts";
import { useMeetingAttendanceTracker } from "../domains/meetings/presentation/useMeetingAttendanceTracker";
import styles from "./RoomPage.module.css";

export const RoomPage: FC = () => {
  const { confineToRoom, appPrompt, preload, header, skipLobby } =
    useRoomEntryUrlContext();
  const { t } = useTranslation();
  const { roomAlias, roomId, meetingId, viaServers } = useRoomIdentifier();
  const location = useLocation();

  const roomIdOrAlias = roomId ?? roomAlias;
  if (!roomIdOrAlias) {
    logger.error("No room specified");
  }

  const { loading, client, error, passwordlessUser } = useClientLegacy();
  const { avatarUrl, displayName: userDisplayName } = useProfile(client);
  const matrixUserId = client?.getUserId() ?? undefined;
  const meetingEntryAccess = useMeetingEntryAccess({
    meetingId,
    userId: matrixUserId,
  });
  const canEnterMeeting =
    !meetingId || meetingEntryAccess.decision?.kind === "allow";

  const groupCallState = useLoadGroupCall(
    client,
    canEnterMeeting ? roomIdOrAlias : null,
    viaServers,
  );
  const [joined, setJoined] = useState(false);
  useMeetingAttendanceTracker({
    joined: joined && canEnterMeeting,
    meetingId,
    userId: matrixUserId,
  });

  const devices = useMediaDevices();
  const [muteStates, setMuteStates] = useState<MuteStates | null>(null);
  const joined$ = useObservable(
    (inputs$) => inputs$.pipe(map(([joined]) => joined)),
    [joined],
  );
  useEffect(() => {
    const scope = new ObservableScope();
    setMuteStates(new MuteStates(scope, devices, joined$));
    return (): void => scope.end();
  }, [devices, joined$]);

  const [optInAnalytics, setOptInAnalytics] = useOptInAnalytics();
  useEffect(() => {
    // During the beta, opt into analytics by default
    if (optInAnalytics === null && setOptInAnalytics) setOptInAnalytics(true);
  }, [optInAnalytics, setOptInAnalytics]);

  const wasInWaitForInviteState = useRef<boolean>(false);

  useEffect(() => {
    if (groupCallState.kind === "loaded" && wasInWaitForInviteState.current) {
      logger.log("Play join sound 'Not yet implemented'");
    }
  }, [groupCallState.kind]);

  const groupCallView = (): ReactNode => {
    switch (groupCallState.kind) {
      case "loaded":
        return (
          muteStates && (
            <GroupCallView
              client={client!}
              rtcSession={groupCallState.rtcSession}
              joined={joined}
              setJoined={setJoined}
              isPasswordlessUser={passwordlessUser}
              confineToRoom={confineToRoom}
              preload={preload}
              skipLobby={skipLobby || wasInWaitForInviteState.current}
              header={header}
              muteStates={muteStates}
            />
          )
        );
      case "waitForInvite":
      case "canKnock": {
        wasInWaitForInviteState.current =
          wasInWaitForInviteState.current ||
          groupCallState.kind === "waitForInvite";
        const knock =
          groupCallState.kind === "canKnock" ? groupCallState.knock : null;
        const label: string | JSX.Element =
          groupCallState.kind === "canKnock" ? (
            t("lobby.ask_to_join")
          ) : (
            <>
              {t("lobby.waiting_for_invite")}
              <CheckIcon />
            </>
          );
        return (
          muteStates && (
            <LobbyView
              client={client!}
              matrixInfo={{
                userId: client!.getUserId() ?? "",
                displayName: userDisplayName ?? "",
                avatarUrl: avatarUrl ?? "",
                roomAlias: null,
                roomId: groupCallState.roomSummary.roomId,
                roomName: groupCallState.roomSummary.name ?? "",
                roomAvatar: groupCallState.roomSummary.avatarUrl ?? null,
                e2eeSystem: {
                  kind: groupCallState.roomSummary.isEncrypted
                    ? E2eeType.PER_PARTICIPANT
                    : E2eeType.NONE,
                },
              }}
              onEnter={(): void => knock?.()}
              enterLabel={label}
              waitingForInvite={groupCallState.kind === "waitForInvite"}
              confineToRoom={confineToRoom}
              hideHeader={header !== "standard"}
              participantCount={null}
              muteStates={muteStates}
              onShareClick={null}
            />
          )
        );
      }
      case "loading":
        return (
          <FullScreenView>
            <h1>{t("common.loading")}</h1>
          </FullScreenView>
        );
      case "failed":
        wasInWaitForInviteState.current = false;
        if ((groupCallState.error as MatrixError).errcode === "M_NOT_FOUND") {
          return (
            <FullScreenView>
              <ErrorView
                Icon={UnknownSolidIcon}
                title={t("error.call_not_found")}
              >
                <Trans i18nKey="error.call_not_found_description">
                  <p>
                    That link doesn't appear to belong to any existing call.
                    Check that you have the right link, or{" "}
                    <Link to="/">create a new one</Link>.
                  </p>
                </Trans>
              </ErrorView>
            </FullScreenView>
          );
        } else if (groupCallState.error instanceof RoomTerminationError) {
          const terminationMessage =
            groupCallState.error.kind === "banned"
              ? {
                  Icon: AdminIcon,
                  title: t("group_call_loader.banned_heading"),
                  body: t("group_call_loader.banned_body"),
                }
              : groupCallState.error.kind === "knockRejected"
                ? {
                    Icon: CloseIcon,
                    title: t("group_call_loader.knock_reject_heading"),
                    body: t("group_call_loader.knock_reject_body"),
                  }
                : {
                    Icon: EndCallIcon,
                    title: t("group_call_loader.call_ended_heading"),
                    body: t("group_call_loader.call_ended_body"),
                  };
          return (
            <FullScreenView>
              <ErrorView
                Icon={terminationMessage.Icon}
                title={terminationMessage.title}
              >
                <p>{terminationMessage.body}</p>
                {groupCallState.error.reason && (
                  <p>
                    {t("group_call_loader.reason", {
                      reason: groupCallState.error.reason,
                    })}
                  </p>
                )}
              </ErrorView>
            </FullScreenView>
          );
        } else {
          return <ErrorPage error={groupCallState.error} />;
        }
      default:
        return <> </>;
    }
  };

  let content: ReactNode;
  if (loading) {
    content = <LoadingPage />;
  } else if (error) {
    content = <ErrorPage error={error} />;
  } else if (!client) {
    content = (
      <Navigate
        to="/login"
        state={{ from: `${location.pathname}${location.search}` }}
        replace
      />
    );
  } else if (!roomIdOrAlias) {
    content = <Navigate to="/" replace />;
  } else if (meetingId && meetingEntryAccess.loading) {
    content = <LoadingPage />;
  } else if (meetingId && meetingEntryAccess.error) {
    content = <ErrorPage error={meetingEntryAccess.error} />;
  } else if (
    meetingId &&
    meetingEntryAccess.decision &&
    meetingEntryAccess.decision.kind !== "allow"
  ) {
    content = (
      <MeetingEntryGateView
        decision={meetingEntryAccess.decision}
        loading={meetingEntryAccess.loading}
        requesting={meetingEntryAccess.requesting}
        onRefresh={meetingEntryAccess.refresh}
        onRequestAccess={() => {
          void meetingEntryAccess.requestAccess();
        }}
      />
    );
  } else {
    content = groupCallView();
  }

  return (
    <>
      {content}
      {/* On Android and iOS, show a prompt to launch the mobile app. */}
      {appPrompt &&
        Config.get().app_prompt &&
        (platform === "android" || platform === "ios") &&
        roomId && <AppSelectionModal roomId={roomId} />}
    </>
  );
};

interface MeetingEntryGateViewProps {
  readonly decision: NonNullable<
    ReturnType<typeof useMeetingEntryAccess>["decision"]
  >;
  readonly loading: boolean;
  readonly requesting: boolean;
  readonly onRefresh: () => void;
  readonly onRequestAccess: () => void;
}

const MeetingEntryGateView: FC<MeetingEntryGateViewProps> = ({
  decision,
  loading,
  requesting,
  onRefresh,
  onRequestAccess,
}) => {
  const { t } = useTranslation();
  const isRequestAction =
    decision.kind === "request_access" || decision.kind === "rejected";

  const metadataKey =
    decision.kind === "wait_for_host"
      ? "meeting_entry.wait_for_host"
      : decision.kind === "request_access"
            ? "meeting_entry.request_access"
            : decision.kind === "pending_approval"
              ? "meeting_entry.pending_approval"
              : decision.kind === "rejected"
                ? "meeting_entry.rejected"
                : decision.kind === "not_invited"
                  ? "meeting_entry.not_invited"
                  : "meeting_entry.meeting_closed";

  const Icon =
    decision.kind === "wait_for_host" || decision.kind === "pending_approval"
      ? CheckIcon
      : decision.kind === "request_access"
        ? AdminIcon
        : decision.kind === "meeting_closed"
          ? EndCallIcon
          : CloseIcon;
  const nextStepSummary =
    decision.kind === "wait_for_host"
      ? t("meeting_entry.next_step.wait_for_host")
      : decision.kind === "request_access"
        ? t("meeting_entry.next_step.request_access")
        : decision.kind === "pending_approval"
          ? t("meeting_entry.next_step.pending_approval")
          : decision.kind === "rejected"
            ? t("meeting_entry.next_step.rejected")
            : decision.kind === "not_invited"
              ? t("meeting_entry.next_step.not_invited")
              : t("meeting_entry.next_step.meeting_closed");

  return (
    <FullScreenView>
      <ErrorView Icon={Icon} title={t(`${metadataKey}.title`)}>
        <p>{t(`${metadataKey}.body`, { title: decision.title })}</p>
        <p className={styles.gateMeta}>
          {t("meeting_entry.policy", {
            accessPolicy: t(`meeting_detail.access_policy.${decision.accessPolicy}`),
          })}
        </p>
        <div className={styles.gateSummary}>
          <p className={styles.gateSummaryLabel}>
            {t("meeting_entry.next_step_title")}
          </p>
          <p className={styles.gateMeta}>{nextStepSummary}</p>
        </div>
        {(decision.kind === "wait_for_host" ||
          decision.kind === "pending_approval") && (
          <div className={styles.gateActions}>
            <Button kind="secondary" disabled={loading} onClick={onRefresh}>
              {t("meeting_entry.refresh")}
            </Button>
          </div>
        )}
        {isRequestAction && (
          <div className={styles.gateActions}>
            <Button
              kind="primary"
              disabled={requesting}
              onClick={onRequestAccess}
            >
              {requesting
                ? t("meeting_entry.requesting")
                : t(
                    decision.kind === "rejected"
                      ? "meeting_entry.request_again"
                      : "meeting_entry.request_access_button",
                  )}
            </Button>
          </div>
        )}
      </ErrorView>
    </FullScreenView>
  );
};
