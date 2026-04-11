/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { type FC, useState } from "react";
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
import { type Meeting } from "../domains/meetings/domain/Meeting";
import { ErrorMessage } from "../input/Input";
import { fireAndForget } from "../utils/fireAndForget";

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
  const [scheduledMeeting, setScheduledMeeting] = useState<Meeting | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<Error>();

  const timezone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  const joinLink = scheduledMeeting
    ? new URL(scheduledMeeting.joinUrl, window.location.origin).toString()
    : "";

  async function copyMeetingLink(): Promise<void> {
    if (!scheduledMeeting) {
      return;
    }

    try {
      if (!navigator.clipboard) {
        throw new Error(t("meeting_scheduler.success.clipboard_unavailable"));
      }

      await navigator.clipboard.writeText(joinLink);
      setCopyError(undefined);
      setCopied(true);
    } catch (error) {
      setCopied(false);
      setCopyError(
        error instanceof Error
          ? error
          : new Error(t("meeting_scheduler.success.copy_failed")),
      );
    }
  }

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

          {!scheduledMeeting && (
            <div className={pageStyles.backRow}>
              <Button
                kind="secondary"
                size="sm"
                onClick={() => {
                  fireAndForget(
                    navigate("/"),
                    "Failed to navigate to home",
                  );
                }}
              >
                {t("meeting_scheduler.back_to_home")}
              </Button>
            </div>
          )}

          <section className={pageStyles.pageCard}>
            {scheduledMeeting ? (
              <div className={pageStyles.successLayout}>
                <div className={pageStyles.pageIntro}>
                  <Text size="sm" className={pageStyles.eyebrow}>
                    {t("meeting_scheduler.success.eyebrow")}
                  </Text>
                  <Heading
                    size="xl"
                    weight="semibold"
                    className={pageStyles.title}
                  >
                    {t("meeting_scheduler.success.title")}
                  </Heading>
                  <Text size="lg" className={pageStyles.description}>
                    {t("meeting_scheduler.success.description")}
                  </Text>
                </div>

                <div className={pageStyles.summaryCard}>
                  <Text size="sm" className={pageStyles.summaryLabel}>
                    {t("meeting_scheduler.success.summary_label")}
                  </Text>
                  <Heading size="lg" weight="semibold">
                    {scheduledMeeting.title}
                  </Heading>
                  <Text size="sm" className={pageStyles.summaryDescription}>
                    {formatMeetingStart(scheduledMeeting.startsAt)}
                  </Text>
                  <Text size="sm" className={pageStyles.summaryDescription}>
                    {t("meeting_scheduler.success.timezone_label", {
                      timezone,
                    })}
                  </Text>
                  <Text size="sm" className={pageStyles.summaryDescription}>
                    {t("meeting_scheduler.success.next_step_title")}
                  </Text>
                  <Text size="sm" className={pageStyles.summaryDescription}>
                    {t("meeting_scheduler.success.next_step")}
                  </Text>
                  <div className={pageStyles.linkGroup}>
                    <Text size="sm" className={pageStyles.summaryLabel}>
                      {t("meeting_scheduler.success.link_label")}
                    </Text>
                    <div
                      className={pageStyles.linkBox}
                      data-testid="meeting_schedule_link"
                    >
                      {joinLink}
                    </div>
                    <Text size="sm" className={pageStyles.summaryDescription}>
                      {t("meeting_scheduler.success.link_hint")}
                    </Text>
                  </div>
                  {copyError && (
                    <div className={pageStyles.copyError}>
                      <ErrorMessage error={copyError} />
                    </div>
                  )}
                  <div className={pageStyles.successActions}>
                    <Button
                      kind="primary"
                      onClick={() => {
                        fireAndForget(copyMeetingLink(), "Failed to copy scheduled meeting link");
                      }}
                    >
                      {copied ? t("action.copied") : t("action.copy_link")}
                    </Button>
                    <Button
                      kind="secondary"
                      onClick={() => {
                        fireAndForget(
                          navigate(`/meetings/${scheduledMeeting.id}`),
                          "Failed to navigate to meeting details",
                        );
                      }}
                    >
                      {t("meeting_scheduler.success.manage_meeting")}
                    </Button>
                    <Button
                      kind="secondary"
                      onClick={() => {
                        setCopied(false);
                        setCopyError(undefined);
                        setScheduledMeeting(null);
                      }}
                    >
                      {t("meeting_scheduler.success.schedule_another")}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className={pageStyles.pageIntro}>
                  <Text size="sm" className={pageStyles.eyebrow}>
                    {t("meeting_scheduler.eyebrow")}
                  </Text>
                  <Heading
                    size="xl"
                    weight="semibold"
                    className={pageStyles.title}
                  >
                    {t("meeting_scheduler.title")}
                  </Heading>
                  <Text size="lg" className={pageStyles.description}>
                    {t("meeting_scheduler.description")}
                  </Text>
                </div>

                <MeetingScheduler
                  client={client}
                  onCancel={() => {
                    fireAndForget(
                      navigate("/"),
                      "Failed to navigate to home",
                    );
                  }}
                  onScheduled={(meeting) => {
                    setCopied(false);
                    setCopyError(undefined);
                    setScheduledMeeting(meeting);
                  }}
                />
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

function formatMeetingStart(startsAt: string | null): string {
  if (!startsAt) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(startsAt));
}
