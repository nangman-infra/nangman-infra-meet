/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { type FC } from "react";
import { useTranslation } from "react-i18next";
import { Button, Heading, Text } from "@vector-im/compound-web";
import { type MatrixClient } from "matrix-js-sdk";
import { Navigate, useNavigate } from "react-router-dom";

import { useClientState } from "../ClientContext";
import { ErrorPage, LoadingPage } from "../FullScreenView";
import { usePageTitle } from "../usePageTitle";
import { Header, HeaderLogo, LeftNav, RightNav } from "../Header";
import { UserMenuContainer } from "../UserMenuContainer";
import { useUiUrlContext } from "../shared/application/readModels/UiUrlContext.ts";
import commonStyles from "./common.module.css";
import registeredViewStyles from "./RegisteredView.module.css";
import pageStyles from "./MeetingSchedulePage.module.css";
import { MeetingScheduler } from "./MeetingScheduler";

export const MeetingSchedulePage: FC = () => {
  const { t } = useTranslation();
  usePageTitle(t("meeting_scheduler.title"));

  const clientState = useClientState();

  if (!clientState) {
    return <LoadingPage />;
  }

  if (clientState.state === "error") {
    return <ErrorPage error={clientState.error} />;
  }

  return clientState.authenticated ? (
    <MeetingScheduleView client={clientState.authenticated.client} />
  ) : (
    <Navigate to="/login" />
  );
};

const MeetingScheduleView: FC<{ client: MatrixClient }> = ({ client }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { header } = useUiUrlContext();

  return (
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
        <div className={pageStyles.shell}>
          <HeaderLogo className={registeredViewStyles.mobileLogo} />

          <div className={pageStyles.backRow}>
            <Button
              kind="secondary"
              size="sm"
              onClick={() => {
                void navigate("/");
              }}
            >
              {t("meeting_scheduler.back_to_home")}
            </Button>
          </div>

          <section className={pageStyles.pageCard}>
            <div className={pageStyles.pageIntro}>
              <Text size="sm" className={pageStyles.eyebrow}>
                {t("meeting_scheduler.eyebrow")}
              </Text>
              <Heading size="xl" weight="semibold" className={pageStyles.title}>
                {t("meeting_scheduler.title")}
              </Heading>
              <Text size="lg" className={pageStyles.description}>
                {t("meeting_scheduler.description")}
              </Text>
            </div>

            <MeetingScheduler
              client={client}
              onCancel={() => {
                void navigate("/");
              }}
              onScheduled={async () => {
                await navigate("/");
              }}
            />
          </section>
        </div>
      </main>
    </div>
  );
};
