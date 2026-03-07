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
              <Heading size="xl" weight="semibold" className={styles.pageTitle}>
                {t("home_dashboard.title")}
              </Heading>
              <Text size="lg" className={styles.pageDescription}>
                {t("home_dashboard.description")}
              </Text>
            </section>

            <section className={styles.instantCard}>
              <div className={styles.cardHeader}>
                <Text size="sm" className={styles.cardEyebrow}>
                  {t("home_dashboard.instant_call_eyebrow")}
                </Text>
                <Heading size="xl" weight="semibold">
                  {t("start_new_call")}
                </Heading>
                <Text size="sm" className={styles.cardDescription}>
                  {t("home_dashboard.instant_call_description")}
                </Text>
              </div>
              <Form className={styles.form} onSubmit={onSubmit}>
                <FieldRow className={styles.inlineRow}>
                  <InputField
                    id="callName"
                    name="callName"
                    label={t("call_name")}
                    placeholder={t("call_name")}
                    type="text"
                    required
                    autoComplete="off"
                    data-testid="home_callName"
                  />

                  <Button
                    type="submit"
                    size="lg"
                    kind="primary"
                    className={styles.button}
                    disabled={loading}
                    data-testid="home_go"
                  >
                    {loading ? t("common.loading") : t("action.go")}
                  </Button>
                </FieldRow>
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
