/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Button, Heading, Text } from "@vector-im/compound-web";
import { type MatrixClient } from "matrix-js-sdk";
import { type TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { useClientState } from "../ClientContext";
import { ErrorPage, LoadingPage } from "../FullScreenView";
import { usePageTitle } from "../usePageTitle";
import { Header, HeaderLogo, LeftNav, RightNav } from "../Header";
import { UserMenuContainer } from "../UserMenuContainer";
import { useUiUrlContext } from "../shared/application/readModels/UiUrlContext.ts";
import commonStyles from "./common.module.css";
import registeredViewStyles from "./RegisteredView.module.css";
import pageStyles from "./MeetingDetailPage.module.css";
import { ErrorMessage, FieldRow, InputField } from "../input/Input";
import { Form } from "../form/Form";
import {
  formatAllowedUserIdsInput,
  parseAllowedUserIdsInput,
} from "../domains/meetings/application/meetingPolicy";
import { useMeetingEntryAccess } from "../domains/meetings/presentation/useMeetingEntryAccess";
import type { MeetingAccessDecision } from "../domains/meetings/domain/MeetingAccessDecision";
import type { MeetingAccessRequest } from "../domains/meetings/domain/MeetingAccessRequest";
import type { Meeting } from "../domains/meetings/domain/Meeting";
import type { MeetingAttendance } from "../domains/meetings/domain/MeetingAttendance";
import {
  approveMeetingAccessRequest,
  endMeeting,
  getMeeting,
  listMeetingAccessRequests,
  listMeetingAttendance,
  rejectMeetingAccessRequest,
  startMeeting,
  updateMeeting,
} from "../domains/meetings/infrastructure/MeetingsApi";

interface MeetingFormState {
  readonly title: string;
  readonly description: string;
  readonly accessPolicy: Meeting["accessPolicy"];
  readonly allowJoinBeforeHost: boolean;
  readonly allowedUserIdsText: string;
  readonly date: string;
  readonly time: string;
}

export const MeetingDetailPage: FC = () => {
  const { t } = useTranslation();
  usePageTitle(t("meeting_detail.title"));

  const clientState = useClientState();

  if (!clientState) {
    return <LoadingPage />;
  }

  if (clientState.state === "error") {
    return <ErrorPage error={clientState.error} />;
  }

  return clientState.authenticated ? (
    <MeetingDetailView client={clientState.authenticated.client} />
  ) : (
    <Navigate to="/login" />
  );
};

const MeetingDetailView: FC<{ client: MatrixClient }> = ({ client }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { meetingId } = useParams<{ meetingId: string }>();
  const { header } = useUiUrlContext();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [attendance, setAttendance] = useState<MeetingAttendance[]>([]);
  const [accessRequests, setAccessRequests] = useState<MeetingAccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState<MeetingFormState | null>(null);
  const [pageError, setPageError] = useState<Error>();
  const [actionError, setActionError] = useState<Error>();
  const [moderationError, setModerationError] = useState<Error>();
  const [actionNotice, setActionNotice] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [moderatingRequestId, setModeratingRequestId] = useState<string>();
  const matrixUserId = client.getUserId() ?? undefined;
  const shouldCheckEntryAccess =
    Boolean(meetingId && meeting && matrixUserId && matrixUserId !== meeting.hostUserId);
  const meetingEntryAccess = useMeetingEntryAccess({
    meetingId: shouldCheckEntryAccess ? meetingId ?? null : null,
    userId: shouldCheckEntryAccess ? matrixUserId : undefined,
  });

  const loadMeetingDetails = useCallback(async (): Promise<void> => {
    if (!meetingId) {
      setPageError(new Error(t("meeting_detail.errors.not_found")));
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const nextMeeting = await getMeeting(meetingId, { userId: matrixUserId });
      let nextAttendance: MeetingAttendance[] = [];
      const shouldLoadAttendance = nextMeeting.hostUserId === matrixUserId;
      const shouldLoadAccessRequests =
        nextMeeting.accessPolicy === "host_approval" &&
        nextMeeting.hostUserId === matrixUserId;

      if (shouldLoadAttendance) {
        nextAttendance = await listMeetingAttendance(meetingId, {
          userId: matrixUserId,
        });
      }

      if (shouldLoadAccessRequests) {
        try {
          const nextAccessRequests = await listMeetingAccessRequests(meetingId, {
            userId: matrixUserId,
          });
          setAccessRequests(nextAccessRequests);
          setModerationError(undefined);
        } catch (error) {
          setAccessRequests([]);
          setModerationError(
            error instanceof Error
              ? error
              : new Error(t("meeting_detail.errors.load_requests_failed")),
          );
        }
      } else {
        setAccessRequests([]);
        setModerationError(undefined);
      }

      setMeeting(nextMeeting);
      setAttendance(nextAttendance);
      setFormState(createMeetingFormState(nextMeeting));
      setPageError(undefined);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error
          : new Error(t("meeting_detail.errors.load_failed")),
      );
    } finally {
      setLoading(false);
    }
  }, [matrixUserId, meetingId, t]);

  useEffect(() => {
    void loadMeetingDetails();
  }, [loadMeetingDetails]);

  const joinLink = useMemo(() => {
    if (!meeting) {
      return "";
    }

    return new URL(meeting.joinUrl, window.location.origin).toString();
  }, [meeting]);

  async function onCopyLink(): Promise<void> {
    if (!meeting) {
      return;
    }

    try {
      if (!navigator.clipboard) {
        throw new Error(t("meeting_detail.errors.clipboard_unavailable"));
      }

      await navigator.clipboard.writeText(joinLink);
      setActionError(undefined);
      setActionNotice(t("meeting_detail.notices.link_copied"));
    } catch (error) {
      setActionNotice(undefined);
      setActionError(
        error instanceof Error
          ? error
          : new Error(t("meeting_detail.errors.copy_failed")),
      );
    }
  }

  async function onSave(): Promise<void> {
    if (!meetingId || !formState) {
      return;
    }

    const normalizedTitle = formState.title.trim();
    if (!normalizedTitle) {
      setActionNotice(undefined);
      setActionError(new Error(t("meeting_detail.errors.title_required")));
      return;
    }

    if (meeting?.status === "scheduled" && (!formState.date || !formState.time)) {
      setActionNotice(undefined);
      setActionError(new Error(t("meeting_detail.errors.start_required")));
      return;
    }

    const startsAt =
      meeting?.status === "scheduled"
        ? new Date(`${formState.date}T${formState.time}`).toISOString()
        : meeting?.startsAt ?? null;
    const allowedUserIds = parseAllowedUserIdsInput(formState.allowedUserIdsText);

    if (formState.accessPolicy === "invite_only" && allowedUserIds.length === 0) {
      setActionNotice(undefined);
      setActionError(
        new Error(t("meeting_detail.errors.allowed_users_required")),
      );
      return;
    }

    setSaving(true);
    setActionError(undefined);
    setActionNotice(undefined);

    try {
      const updatedMeeting = await updateMeeting(
        meetingId,
        {
          title: normalizedTitle,
          description: formState.description.trim() || null,
          accessPolicy: formState.accessPolicy,
          allowJoinBeforeHost: formState.allowJoinBeforeHost,
          allowedUserIds,
          startsAt,
        },
        { userId: matrixUserId },
      );

      setMeeting(updatedMeeting);
      setFormState(createMeetingFormState(updatedMeeting));
      setActionNotice(t("meeting_detail.notices.saved"));
      await loadMeetingDetails();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error
          : new Error(t("meeting_detail.errors.save_failed")),
      );
    } finally {
      setSaving(false);
    }
  }

  async function onModerateRequest(
    request: MeetingAccessRequest,
    action: "approve" | "reject",
  ): Promise<void> {
    if (!meetingId) {
      return;
    }

    setModeratingRequestId(request.id);
    setActionError(undefined);
    setActionNotice(undefined);

    try {
      if (action === "approve") {
        await approveMeetingAccessRequest(meetingId, request.id, {
          userId: matrixUserId,
        });
      } else {
        await rejectMeetingAccessRequest(meetingId, request.id, {
          userId: matrixUserId,
        });
      }

      setActionNotice(
        t(
          action === "approve"
            ? "meeting_detail.notices.request_approved"
            : "meeting_detail.notices.request_rejected",
          { userId: request.userId },
        ),
      );
      await loadMeetingDetails();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error
          : new Error(t("meeting_detail.errors.moderation_failed")),
      );
    } finally {
      setModeratingRequestId(undefined);
    }
  }

  async function onStart(): Promise<void> {
    if (!meetingId) {
      return;
    }

    setStarting(true);
    setActionError(undefined);
    setActionNotice(undefined);

    try {
      const nextMeeting = await startMeeting(meetingId, { userId: matrixUserId });
      setMeeting(nextMeeting);
      setFormState(createMeetingFormState(nextMeeting));
      setActionNotice(t("meeting_detail.notices.started"));
      await loadMeetingDetails();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error
          : new Error(t("meeting_detail.errors.start_failed")),
      );
    } finally {
      setStarting(false);
    }
  }

  async function onEnd(): Promise<void> {
    if (!meetingId) {
      return;
    }

    setEnding(true);
    setActionError(undefined);
    setActionNotice(undefined);

    try {
      const nextMeeting = await endMeeting(meetingId, { userId: matrixUserId });
      setMeeting(nextMeeting);
      setFormState(createMeetingFormState(nextMeeting));
      setActionNotice(
        t(
          meeting?.status === "scheduled"
            ? "meeting_detail.notices.cancelled"
            : "meeting_detail.notices.ended",
        ),
      );
      await loadMeetingDetails();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error
          : new Error(t("meeting_detail.errors.end_failed")),
      );
    } finally {
      setEnding(false);
    }
  }

  if (loading) {
    return <LoadingPage />;
  }

  if (pageError || !meeting || !formState) {
    return <ErrorPage error={pageError ?? new Error(t("meeting_detail.errors.not_found"))} />;
  }

  const presentCount = attendance.filter(
    (entry) => entry.status === "present",
  ).length;
  const participantCount = new Set(attendance.map((entry) => entry.userId)).size;
  const isMeetingHost = matrixUserId === meeting.hostUserId;
  const canEditMeeting = isMeetingHost && meeting.status !== "ended";
  const pendingAccessRequests = accessRequests.filter(
    (request) => request.status === "pending",
  );
  const entryDecision = !isMeetingHost ? meetingEntryAccess.decision : null;
  const canJoinMeeting =
    meeting.status !== "ended" &&
    (isMeetingHost || entryDecision?.kind === "allow");
  const canCopyMeetingLink =
    isMeetingHost || entryDecision?.kind === "allow";
  const shouldShowAccessState =
    !isMeetingHost && entryDecision !== null && entryDecision.kind !== "allow";
  const canRequestMeetingAccess =
    entryDecision?.kind === "request_access" ||
    entryDecision?.kind === "rejected";
  const canRefreshMeetingAccess =
    entryDecision?.kind === "wait_for_host" ||
    entryDecision?.kind === "pending_approval";
  const entryStateCopy =
    shouldShowAccessState && entryDecision
      ? getMeetingEntryStateCopy(entryDecision.kind, meeting.title, t)
      : null;

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
              {t("meeting_detail.back_to_home")}
            </Button>
          </div>

          <section className={pageStyles.pageCard}>
            <div className={pageStyles.hero}>
              <div className={pageStyles.heroText}>
                <Text size="sm" className={pageStyles.eyebrow}>
                  {t("meeting_detail.eyebrow")}
                </Text>
                <Heading size="xl" weight="semibold" className={pageStyles.title}>
                  {meeting.title}
                </Heading>
                <Text size="lg" className={pageStyles.description}>
                  {t("meeting_detail.description")}
                </Text>
              </div>
              <div className={pageStyles.heroStats}>
                <span className={pageStyles.statPill}>
                  {getMeetingStatusLabel(meeting.status, t)}
                </span>
                {isMeetingHost && (
                  <span className={pageStyles.statPill}>
                    {t("meeting_detail.present_count", { count: presentCount })}
                  </span>
                )}
                {isMeetingHost && (
                  <span className={pageStyles.statPill}>
                    {t("meeting_detail.participant_count", {
                      count: participantCount,
                    })}
                  </span>
                )}
              </div>
            </div>

            <div className={pageStyles.grid}>
              <section className={pageStyles.panel}>
                <div className={pageStyles.panelHeader}>
                  <Heading size="md" weight="semibold">
                    {t("meeting_detail.overview_title")}
                  </Heading>
                  <Text size="sm" className={pageStyles.muted}>
                    {formatMeetingStart(meeting.startsAt, t)}
                  </Text>
                </div>

                <div className={pageStyles.summaryList}>
                  <div className={pageStyles.summaryItem}>
                    <Text size="sm" className={pageStyles.summaryLabel}>
                      {t("meeting_detail.host_label")}
                    </Text>
                    <Text size="sm">{meeting.hostUserId}</Text>
                  </div>
                  <div className={pageStyles.summaryItem}>
                    <Text size="sm" className={pageStyles.summaryLabel}>
                      {t("meeting_detail.access_policy_label")}
                    </Text>
                    <Text size="sm">
                      {t(`meeting_detail.access_policy.${meeting.accessPolicy}`)}
                    </Text>
                  </div>
                  <div className={pageStyles.summaryItem}>
                    <Text size="sm" className={pageStyles.summaryLabel}>
                      {t("meeting_detail.join_before_host_label")}
                    </Text>
                    <Text size="sm">
                      {meeting.allowJoinBeforeHost
                        ? t("meeting_detail.allow_join_before_host_yes")
                        : t("meeting_detail.allow_join_before_host_no")}
                    </Text>
                  </div>
                  <div className={pageStyles.summaryItem}>
                    <Text size="sm" className={pageStyles.summaryLabel}>
                      {t("meeting_detail.allowed_users_label")}
                    </Text>
                    <Text size="sm">
                      {meeting.accessPolicy === "invite_only"
                        ? meeting.allowedUserIds.length > 0
                          ? t("meeting_detail.allowed_users_count", {
                              count: meeting.allowedUserIds.length,
                            })
                          : t("meeting_detail.allowed_users_empty")
                        : t("meeting_detail.allowed_users_not_required")}
                    </Text>
                  </div>
                  {meeting.accessPolicy === "host_approval" && isMeetingHost && (
                    <div className={pageStyles.summaryItem}>
                      <Text size="sm" className={pageStyles.summaryLabel}>
                        {t("meeting_detail.access_requests_label")}
                      </Text>
                      <Text size="sm">
                        {t("meeting_detail.pending_requests_count", {
                          count: pendingAccessRequests.length,
                        })}
                      </Text>
                    </div>
                  )}
                  {canCopyMeetingLink && (
                    <div className={pageStyles.summaryItem}>
                      <Text size="sm" className={pageStyles.summaryLabel}>
                        {t("meeting_detail.link_label")}
                      </Text>
                      <Text size="sm" className={pageStyles.linkValue}>
                        {joinLink}
                      </Text>
                    </div>
                  )}
                </div>

                <div className={pageStyles.primaryActions}>
                  {meeting.status === "scheduled" && isMeetingHost && (
                    <Button
                      kind="primary"
                      onClick={() => {
                        void onStart();
                      }}
                      disabled={starting}
                    >
                      {starting
                        ? t("meeting_detail.starting")
                        : t("meeting_detail.start")}
                    </Button>
                  )}
                  {canJoinMeeting && (
                    <Button
                      kind="primary"
                      onClick={() => {
                        void navigate(meeting.joinUrl);
                      }}
                    >
                      {t("meeting_detail.join")}
                    </Button>
                  )}
                  {meeting.status !== "ended" && isMeetingHost && (
                    <Button
                      kind="secondary"
                      onClick={() => {
                        void onEnd();
                      }}
                      disabled={ending}
                    >
                      {ending
                        ? t("meeting_detail.ending")
                        : t(
                            meeting.status === "scheduled"
                              ? "meeting_detail.cancel"
                              : "meeting_detail.end",
                          )}
                    </Button>
                  )}
                  {!isMeetingHost && canRequestMeetingAccess && (
                    <Button
                      kind="primary"
                      disabled={meetingEntryAccess.requesting}
                      onClick={() => {
                        void meetingEntryAccess.requestAccess();
                      }}
                    >
                      {meetingEntryAccess.requesting
                        ? t("meeting_entry.requesting")
                        : t(
                            entryDecision.kind === "rejected"
                              ? "meeting_entry.request_again"
                              : "meeting_entry.request_access_button",
                          )}
                    </Button>
                  )}
                  {!isMeetingHost && canRefreshMeetingAccess && (
                    <Button
                      kind="secondary"
                      disabled={meetingEntryAccess.loading}
                      onClick={meetingEntryAccess.refresh}
                    >
                      {t("meeting_entry.refresh")}
                    </Button>
                  )}
                  {canCopyMeetingLink && (
                    <Button
                      kind="secondary"
                      onClick={() => {
                        void onCopyLink();
                      }}
                    >
                      {t("action.copy_link")}
                    </Button>
                  )}
                </div>
                {!isMeetingHost && meetingEntryAccess.error && (
                  <ErrorMessage error={meetingEntryAccess.error} />
                )}
                {entryStateCopy && (
                  <>
                    <Text size="sm" weight="semibold">
                      {entryStateCopy.title}
                    </Text>
                    <Text size="sm" className={pageStyles.muted}>
                      {entryStateCopy.body}
                    </Text>
                  </>
                )}
              </section>

              {canEditMeeting && (
                <section className={pageStyles.panel}>
                  <div className={pageStyles.panelHeader}>
                    <Heading size="md" weight="semibold">
                      {t("meeting_detail.edit_title")}
                    </Heading>
                    <Text size="sm" className={pageStyles.muted}>
                      {t("meeting_detail.edit_description")}
                    </Text>
                  </div>

                  <Form
                    className={pageStyles.form}
                    onSubmit={(event) => {
                      event.preventDefault();
                      void onSave();
                    }}
                    noValidate
                  >
                  <FieldRow>
                    <InputField
                      id="meetingDetailTitle"
                      name="meetingDetailTitle"
                      label={t("meeting_detail.form.title_label")}
                      type="text"
                      value={formState.title}
                      onChange={(event) => {
                        setActionError(undefined);
                        setActionNotice(undefined);
                        setFormState((current) =>
                          current
                            ? { ...current, title: event.target.value }
                            : current,
                        );
                      }}
                    />
                  </FieldRow>
                  <FieldRow>
                    <InputField
                      id="meetingDetailDescription"
                      name="meetingDetailDescription"
                      label={t("meeting_detail.form.description_label")}
                      type="textarea"
                      value={formState.description}
                      onChange={(event) => {
                        setActionError(undefined);
                        setActionNotice(undefined);
                        setFormState((current) =>
                          current
                            ? { ...current, description: event.target.value }
                            : current,
                        );
                      }}
                    />
                  </FieldRow>
                  {meeting.status === "scheduled" && (
                    <FieldRow className={pageStyles.scheduleRow}>
                      <InputField
                        id="meetingDetailDate"
                        name="meetingDetailDate"
                        label={t("meeting_detail.form.date_label")}
                        type="date"
                        value={formState.date}
                        onChange={(event) => {
                          setActionError(undefined);
                          setActionNotice(undefined);
                          setFormState((current) =>
                            current
                              ? { ...current, date: event.target.value }
                              : current,
                          );
                        }}
                      />
                      <InputField
                        id="meetingDetailTime"
                        name="meetingDetailTime"
                        label={t("meeting_detail.form.time_label")}
                        type="time"
                        value={formState.time}
                        onChange={(event) => {
                          setActionError(undefined);
                          setActionNotice(undefined);
                          setFormState((current) =>
                            current
                              ? { ...current, time: event.target.value }
                              : current,
                          );
                        }}
                      />
                    </FieldRow>
                  )}
                  <FieldRow>
                    <div className={pageStyles.optionGroup}>
                      <Text size="sm" className={pageStyles.summaryLabel}>
                        {t("meeting_detail.form.access_policy_label")}
                      </Text>
                      <div className={pageStyles.optionButtons}>
                        {(
                          ["open", "host_approval", "invite_only"] as const
                        ).map((value) => (
                          <Button
                            key={value}
                            type="button"
                            kind={
                              formState.accessPolicy === value
                                ? "primary"
                                : "secondary"
                            }
                            size="sm"
                            onClick={() => {
                              setActionError(undefined);
                              setActionNotice(undefined);
                              setFormState((current) =>
                                current
                                  ? { ...current, accessPolicy: value }
                                  : current,
                              );
                            }}
                          >
                            {t(`meeting_detail.access_policy.${value}`)}
                          </Button>
                        ))}
                      </div>
                      <Text size="sm" className={pageStyles.muted}>
                        {t(`meeting_detail.policy_help.${formState.accessPolicy}`)}
                      </Text>
                    </div>
                  </FieldRow>
                  <FieldRow>
                    <InputField
                      id="meetingAllowJoinBeforeHost"
                      name="meetingAllowJoinBeforeHost"
                      type="checkbox"
                      label={t("meeting_detail.form.allow_join_before_host")}
                      checked={formState.allowJoinBeforeHost}
                      onChange={(event) => {
                        setActionError(undefined);
                        setActionNotice(undefined);
                        setFormState((current) =>
                          current
                            ? {
                                ...current,
                                allowJoinBeforeHost: event.target.checked,
                              }
                            : current,
                        );
                      }}
                    />
                  </FieldRow>
                  {formState.accessPolicy === "invite_only" && (
                    <FieldRow>
                      <InputField
                        id="meetingDetailAllowedUserIds"
                        name="meetingDetailAllowedUserIds"
                        label={t("meeting_detail.form.allowed_user_ids_label")}
                        description={t(
                          "meeting_detail.form.allowed_user_ids_description",
                        )}
                        placeholder={t(
                          "meeting_detail.form.allowed_user_ids_placeholder",
                        )}
                        type="textarea"
                        value={formState.allowedUserIdsText}
                        onChange={(event) => {
                          setActionError(undefined);
                          setActionNotice(undefined);
                          setFormState((current) =>
                            current
                              ? {
                                  ...current,
                                  allowedUserIdsText: event.target.value,
                                }
                              : current,
                          );
                        }}
                      />
                    </FieldRow>
                  )}
                  {actionError && (
                    <FieldRow>
                      <ErrorMessage error={actionError} />
                    </FieldRow>
                  )}
                  {actionNotice && (
                    <FieldRow>
                      <p className={pageStyles.notice}>{actionNotice}</p>
                    </FieldRow>
                  )}
                    <FieldRow rightAlign className={pageStyles.actions}>
                      <Button type="submit" kind="primary" disabled={saving}>
                        {saving
                          ? t("meeting_detail.saving")
                          : t("meeting_detail.save")}
                      </Button>
                    </FieldRow>
                  </Form>
                </section>
              )}
            </div>

            {meeting.accessPolicy === "host_approval" && isMeetingHost && (
              <section className={pageStyles.panel}>
                <div className={pageStyles.panelHeader}>
                  <Heading size="md" weight="semibold">
                    {t("meeting_detail.moderation_title")}
                  </Heading>
                  <Text size="sm" className={pageStyles.muted}>
                    {t("meeting_detail.moderation_description")}
                  </Text>
                </div>
                {moderationError && <ErrorMessage error={moderationError} />}
                {accessRequests.length === 0 ? (
                  <Text size="sm" className={pageStyles.muted}>
                    {t("meeting_detail.moderation_empty")}
                  </Text>
                ) : (
                  <div className={pageStyles.requestList}>
                    {accessRequests.map((request) => (
                      <article key={request.id} className={pageStyles.requestRow}>
                        <div className={pageStyles.requestBody}>
                          <Text weight="semibold">{request.userId}</Text>
                          <Text size="sm" className={pageStyles.muted}>
                            {t(`meeting_detail.request_status.${request.status}`)}
                          </Text>
                          <Text size="sm" className={pageStyles.muted}>
                            {t("meeting_detail.requested_at", {
                              date: formatDateTime(request.requestedAt),
                            })}
                          </Text>
                          {request.respondedAt && (
                            <Text size="sm" className={pageStyles.muted}>
                              {t("meeting_detail.responded_at", {
                                date: formatDateTime(request.respondedAt),
                              })}
                            </Text>
                          )}
                        </div>
                        {request.status === "pending" && (
                          <div className={pageStyles.requestActions}>
                            <Button
                              kind="primary"
                              size="sm"
                              disabled={moderatingRequestId === request.id}
                              onClick={() => {
                                void onModerateRequest(request, "approve");
                              }}
                            >
                              {moderatingRequestId === request.id
                                ? t("meeting_detail.processing")
                                : t("meeting_detail.approve_request")}
                            </Button>
                            <Button
                              kind="secondary"
                              size="sm"
                              disabled={moderatingRequestId === request.id}
                              onClick={() => {
                                void onModerateRequest(request, "reject");
                              }}
                            >
                              {t("meeting_detail.reject_request")}
                            </Button>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {isMeetingHost && (
              <section className={pageStyles.panel}>
                <div className={pageStyles.panelHeader}>
                  <Heading size="md" weight="semibold">
                    {t("meeting_detail.attendance_title")}
                  </Heading>
                  <Text size="sm" className={pageStyles.muted}>
                    {t("meeting_detail.attendance_description")}
                  </Text>
                </div>
                {attendance.length === 0 ? (
                  <Text size="sm" className={pageStyles.muted}>
                    {t("meeting_detail.attendance_empty")}
                  </Text>
                ) : (
                  <div className={pageStyles.attendanceList}>
                    {attendance.map((entry) => (
                      <article key={entry.id} className={pageStyles.attendanceRow}>
                        <div>
                          <Text weight="semibold">{entry.userId}</Text>
                          <Text size="sm" className={pageStyles.muted}>
                            {t(
                              entry.status === "present"
                                ? "meeting_detail.attendance_present"
                                : "meeting_detail.attendance_left",
                            )}
                          </Text>
                        </div>
                        <div className={pageStyles.attendanceMeta}>
                          <Text size="sm" className={pageStyles.muted}>
                            {t("meeting_detail.joined_at", {
                              date: formatDateTime(entry.joinedAt),
                            })}
                          </Text>
                          {entry.leftAt && (
                            <Text size="sm" className={pageStyles.muted}>
                              {t("meeting_detail.left_at", {
                                date: formatDateTime(entry.leftAt),
                              })}
                            </Text>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

function createMeetingFormState(meeting: Meeting): MeetingFormState {
  const fallbackStart = meeting.startsAt ? new Date(meeting.startsAt) : new Date();

  return {
    title: meeting.title,
    description: meeting.description ?? "",
    accessPolicy: meeting.accessPolicy,
    allowJoinBeforeHost: meeting.allowJoinBeforeHost,
    allowedUserIdsText: formatAllowedUserIdsInput(meeting.allowedUserIds),
    date: formatDateInputValue(fallbackStart),
    time: formatTimeInputValue(fallbackStart),
  };
}

function formatMeetingStart(
  startsAt: string | null,
  t: TFunction,
): string {
  if (!startsAt) {
    return t("meeting_detail.no_start_time");
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(startsAt));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeInputValue(value: Date): string {
  const hours = `${value.getHours()}`.padStart(2, "0");
  const minutes = `${value.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

function getMeetingStatusLabel(
  status: Meeting["status"],
  t: TFunction,
): string {
  switch (status) {
    case "scheduled":
      return t("meeting_planner.status.scheduled");
    case "live":
      return t("meeting_planner.status.live");
    case "ended":
      return t("meeting_planner.status.ended");
    default:
      return t("meeting_planner.status.draft");
  }
}

function getMeetingEntryStateCopy(
  kind: Exclude<MeetingAccessDecision["kind"], "allow">,
  title: string,
  t: TFunction,
): { title: string; body: string } {
  switch (kind) {
    case "wait_for_host":
      return {
        title: t("meeting_entry.wait_for_host.title"),
        body: t("meeting_entry.wait_for_host.body", { title }),
      };
    case "request_access":
      return {
        title: t("meeting_entry.request_access.title"),
        body: t("meeting_entry.request_access.body", { title }),
      };
    case "pending_approval":
      return {
        title: t("meeting_entry.pending_approval.title"),
        body: t("meeting_entry.pending_approval.body", { title }),
      };
    case "rejected":
      return {
        title: t("meeting_entry.rejected.title"),
        body: t("meeting_entry.rejected.body", { title }),
      };
    case "not_invited":
      return {
        title: t("meeting_entry.not_invited.title"),
        body: t("meeting_entry.not_invited.body", { title }),
      };
    case "meeting_ended":
      return {
        title: t("meeting_entry.meeting_ended.title"),
        body: t("meeting_entry.meeting_ended.body", { title }),
      };
    default:
      return {
        title: t("meeting_entry.request_access.title"),
        body: t("meeting_entry.request_access.body", { title }),
      };
  }
}
