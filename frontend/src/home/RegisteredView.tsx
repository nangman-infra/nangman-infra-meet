/*
Copyright 2022-2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import {
  useState,
  useCallback,
  type FormEvent,
  type FormEventHandler,
  type FC,
} from "react";
import { type MatrixClient } from "matrix-js-sdk";
import { useTranslation } from "react-i18next";
import { Heading, Text } from "@vector-im/compound-web";
import { logger } from "matrix-js-sdk/lib/logger";
import { Button } from "@vector-im/compound-web";
import { useNavigate } from "react-router-dom";

import {
  createRoom,
  getRelativeRoomUrl,
  roomAliasLocalpartFromRoomName,
  sanitiseRoomNameInput,
} from "../utils/matrix";
import { useGroupCallRooms } from "./useGroupCallRooms";
import { Header, HeaderLogo, LeftNav, RightNav } from "../Header";
import commonStyles from "./common.module.css";
import styles from "./RegisteredView.module.css";
import { FieldRow, InputField, ErrorMessage } from "../input/Input";
import { CallList } from "./CallList";
import { UserMenuContainer } from "../UserMenuContainer";
import { JoinExistingCallModal } from "./JoinExistingCallModal";
import { Form } from "../form/Form";
import { AnalyticsNotice } from "../analytics/AnalyticsNotice";
import { E2eeType } from "../e2ee/e2eeType";
import { useOptInAnalytics } from "../settings/settings";
import { useUiUrlContext } from "../shared/application/readModels/UiUrlContext.ts";
import { MeetingPlanner } from "./MeetingPlanner";
import { resolveJoinTarget } from "./resolveJoinTarget";

interface Props {
  client: MatrixClient;
}

export const RegisteredView: FC<Props> = ({ client }) => {
  const { header } = useUiUrlContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();
  const [optInAnalytics] = useOptInAnalytics();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [joinExistingCallModalOpen, setJoinExistingCallModalOpen] =
    useState(false);
  const [joinTarget, setJoinTarget] = useState("");
  const [joinError, setJoinError] = useState<Error>();
  const onDismissJoinExistingCallModal = useCallback(
    () => setJoinExistingCallModalOpen(false),
    [setJoinExistingCallModalOpen],
  );

  const onSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const data = new FormData(e.target as HTMLFormElement);
      const roomNameData = data.get("callName");
      const roomName =
        typeof roomNameData === "string"
          ? sanitiseRoomNameInput(roomNameData)
          : "";

      async function submit(): Promise<void> {
        setError(undefined);
        setLoading(true);

        const createRoomResult = await createRoom(
          client,
          roomName,
          E2eeType.SHARED_KEY,
        );
        if (!createRoomResult.password)
          throw new Error("Failed to create room with shared secret");

        await navigate(
          getRelativeRoomUrl(
            createRoomResult.roomId,
            { kind: E2eeType.SHARED_KEY, secret: createRoomResult.password },
            roomName,
          ),
        );
      }

      submit().catch((error) => {
        if (error.errcode === "M_ROOM_IN_USE") {
          setExistingAlias(roomAliasLocalpartFromRoomName(roomName));
          setLoading(false);
          setError(undefined);
          setJoinExistingCallModalOpen(true);
        } else {
          logger.error(error);
          setLoading(false);
          setError(error);
        }
      });
    },
    [client, navigate, setJoinExistingCallModalOpen],
  );

  const recentRooms = useGroupCallRooms(client);

  const [existingAlias, setExistingAlias] = useState<string>();
  const onJoinExistingRoom = useCallback(() => {
    navigate(`/${existingAlias}`)?.catch((error) => {
      logger.error("Failed to navigate to existing alias", error);
    });
  }, [navigate, existingAlias]);

  const onJoinSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setJoinError(undefined);

      const resolvedTarget = resolveJoinTarget(joinTarget);
      if (!resolvedTarget) {
        setJoinError(new Error(t("home_dashboard.errors.invalid_join_target")));
        return;
      }

      void navigate(resolvedTarget);
    },
    [joinTarget, navigate, t],
  );

  return (
    <>
      <div className={commonStyles.container}>
        {header === "standard" && (
          <Header>
            <LeftNav>
              <HeaderLogo />
            </LeftNav>
            <RightNav>
              <UserMenuContainer />
            </RightNav>
          </Header>
        )}
        <main className={commonStyles.main}>
          <div className={styles.shell}>
            <HeaderLogo className={styles.mobileLogo} />

            <section className={styles.pageIntro}>
              <Text size="sm" className={styles.eyebrow}>
                {t("home_dashboard.eyebrow")}
              </Text>
              <Heading size="lg" weight="semibold" className={styles.pageTitle}>
                {t("home_dashboard.title")}
              </Heading>
              <Text size="md" className={styles.pageDescription}>
                {t("home_dashboard.description")}
              </Text>
            </section>

            <section className={styles.actionGrid}>
              <section className={styles.instantCard}>
                <div className={styles.cardHeader}>
                  <Text size="sm" className={styles.cardEyebrow}>
                    {t("home_dashboard.instant_call_eyebrow")}
                  </Text>
                  <Heading size="lg" weight="semibold">
                    {t("home_dashboard.instant_call_title")}
                  </Heading>
                  <Text size="sm" className={styles.cardDescription}>
                    {t("home_dashboard.instant_call_description")}
                  </Text>
                </div>
                <Form className={styles.form} onSubmit={onSubmit}>
                  <FieldRow className={styles.fieldRow}>
                    <InputField
                      id="callName"
                      name="callName"
                      label={t("home_dashboard.instant_call_label")}
                      placeholder={t("home_dashboard.instant_call_placeholder")}
                      type="text"
                      required
                      autoComplete="off"
                      data-testid="home_callName"
                    />
                  </FieldRow>
                  <Button
                    type="submit"
                    size="lg"
                    kind="primary"
                    className={styles.fullWidthButton}
                    disabled={loading}
                    data-testid="home_go"
                  >
                    {loading
                      ? t("common.loading")
                      : t("home_dashboard.instant_call_action")}
                  </Button>
                  {optInAnalytics === null && (
                    <Text size="sm" className={styles.notice}>
                      <AnalyticsNotice />
                    </Text>
                  )}
                  {error && (
                    <FieldRow className={styles.fieldRow}>
                      <ErrorMessage error={error} />
                    </FieldRow>
                  )}
                </Form>
              </section>

              <div className={styles.actionStack}>
                <section className={styles.actionCard}>
                  <div className={styles.cardHeader}>
                    <Text size="sm" className={styles.cardEyebrow}>
                      {t("home_dashboard.join_call_eyebrow")}
                    </Text>
                    <Heading size="md" weight="semibold">
                      {t("home_dashboard.join_call_title")}
                    </Heading>
                    <Text size="sm" className={styles.cardDescription}>
                      {t("home_dashboard.join_call_description")}
                    </Text>
                  </div>
                  <Form className={styles.form} onSubmit={onJoinSubmit}>
                    <FieldRow className={styles.fieldRow}>
                      <InputField
                        id="joinTarget"
                        name="joinTarget"
                        label={t("home_dashboard.join_call_label")}
                        placeholder={t("home_dashboard.join_call_placeholder")}
                        description={t("home_dashboard.join_call_hint")}
                        type="text"
                        required
                        autoComplete="off"
                        value={joinTarget}
                        onChange={(event) => {
                          setJoinError(undefined);
                          setJoinTarget(event.target.value);
                        }}
                      />
                    </FieldRow>
                    {joinError && (
                      <FieldRow className={styles.fieldRow}>
                        <ErrorMessage error={joinError} />
                      </FieldRow>
                    )}
                    <Button
                      type="submit"
                      size="lg"
                      kind="secondary"
                      className={styles.fullWidthButton}
                    >
                      {t("home_dashboard.join_call_action")}
                    </Button>
                  </Form>
                </section>

                <section className={styles.actionCard}>
                  <div className={styles.cardHeader}>
                    <Text size="sm" className={styles.cardEyebrow}>
                      {t("home_dashboard.schedule_card_eyebrow")}
                    </Text>
                    <Heading size="md" weight="semibold">
                      {t("home_dashboard.schedule_card_title")}
                    </Heading>
                    <Text size="sm" className={styles.cardDescription}>
                      {t("home_dashboard.schedule_card_description")}
                    </Text>
                  </div>
                  <Button
                    size="lg"
                    kind="secondary"
                    className={styles.fullWidthButton}
                    onClick={() => {
                      void navigate("/meetings/new");
                    }}
                  >
                    {t("home_dashboard.schedule_card_action")}
                  </Button>
                </section>
              </div>
            </section>

            <MeetingPlanner />

            {recentRooms.length > 0 && (
              <section className={styles.recentSection}>
                <div className={styles.recentSectionHeader}>
                  <Heading size="md" weight="semibold">
                    {t("home_dashboard.recent_rooms_title")}
                  </Heading>
                  <Text size="sm" className={styles.cardDescription}>
                    {t("home_dashboard.recent_rooms_description")}
                  </Text>
                </div>
                <CallList rooms={recentRooms} client={client} />
              </section>
            )}
          </div>
        </main>
      </div>
      <JoinExistingCallModal
        onJoin={onJoinExistingRoom}
        open={joinExistingCallModalOpen}
        onDismiss={onDismissJoinExistingCallModal}
      />
    </>
  );
};
