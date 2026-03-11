import { useEffect, useState, type FC } from "react";
import { type TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Button, Heading, Text } from "@vector-im/compound-web";
import { useNavigate } from "react-router-dom";

import {
  listMeetings,
  startMeeting,
} from "../domains/meetings/infrastructure/MeetingsApi";
import { Meeting } from "../domains/meetings/domain/Meeting";
import { ErrorMessage } from "../input/Input";
import styles from "./MeetingPlanner.module.css";

const COPY_TOAST_TIMEOUT_MS = 1_800;

export const MeetingPlanner: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [copiedMeetingId, setCopiedMeetingId] = useState<string>();
  const [listError, setListError] = useState<Error>();

  async function loadMeetings(): Promise<void> {
    setLoadingMeetings(true);
    try {
      setListError(undefined);
      setMeetings(await listMeetings());
    } catch (nextError) {
      setListError(
        nextError instanceof Error
          ? nextError
          : new Error(t("meeting_planner.errors.load_failed")),
      );
    } finally {
      setLoadingMeetings(false);
    }
  }

  useEffect(() => {
    void loadMeetings();
  }, []);

  useEffect(() => {
    if (!copiedMeetingId) return;

    const timeoutId = window.setTimeout(() => {
      setCopiedMeetingId(undefined);
    }, COPY_TOAST_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copiedMeetingId]);

  async function onStartMeeting(meeting: Meeting): Promise<void> {
    setListError(undefined);
    try {
      await startMeeting(meeting.id);
      await loadMeetings();
      await navigate(meeting.joinUrl);
    } catch (nextError) {
      setListError(
        nextError instanceof Error
          ? nextError
          : new Error(t("meeting_planner.errors.start_failed")),
      );
    }
  }

  async function onCopyMeetingLink(meeting: Meeting): Promise<void> {
    try {
      if (!navigator.clipboard) {
        throw new Error(t("meeting_planner.errors.clipboard_unavailable"));
      }

      const joinUrl = new URL(meeting.joinUrl, window.location.origin).toString();
      await navigator.clipboard.writeText(joinUrl);
      setCopiedMeetingId(meeting.id);
    } catch (nextError) {
      setListError(
        nextError instanceof Error
          ? nextError
          : new Error(t("meeting_planner.errors.copy_failed")),
      );
    }
  }

  const sortedMeetings = [...meetings].sort((left, right) => {
    const leftStatusRank = getMeetingStatusRank(left.status);
    const rightStatusRank = getMeetingStatusRank(right.status);

    if (leftStatusRank !== rightStatusRank) {
      return leftStatusRank - rightStatusRank;
    }

    const leftSortKey = left.startsAt ?? left.createdAt;
    const rightSortKey = right.startsAt ?? right.createdAt;
    return leftSortKey.localeCompare(rightSortKey);
  });
  const visibleMeetings = sortedMeetings.filter(
    (meeting) => meeting.status !== "ended",
  );
  const liveMeetingsCount = visibleMeetings.filter(
    (meeting) => meeting.status === "live",
  ).length;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionMeta}>
          <Text size="sm" className={styles.sectionEyebrow}>
            {t("meeting_planner.eyebrow")}
          </Text>
          <Heading size="md" weight="semibold" className={styles.sectionTitle}>
            {t("meeting_planner.title")}
          </Heading>
          <Text size="sm" className={styles.sectionDescription}>
            {t("meeting_planner.description")}
          </Text>
        </div>
        <div className={styles.sectionActions}>
          <div className={styles.sectionStats}>
            <span className={styles.statPill}>
              {t("meeting_planner.upcoming_count", {
                count: visibleMeetings.length,
              })}
            </span>
            {liveMeetingsCount > 0 && (
              <span className={[styles.statPill, styles.statLive].join(" ")}>
                {t("meeting_planner.live_count", {
                  count: liveMeetingsCount,
                })}
              </span>
            )}
          </div>
          <Button
            size="lg"
            kind="primary"
            onClick={() => {
              void navigate("/meetings/new");
            }}
          >
            {t("meeting_planner.schedule")}
          </Button>
        </div>
      </div>

      {listError && (
        <div className={styles.listError}>
          <ErrorMessage error={listError} />
        </div>
      )}

      <div className={styles.meetingsList}>
        {loadingMeetings ? (
          <div className={styles.emptyStateCard}>
            <Text size="sm" className={styles.emptyState}>
              {t("meeting_planner.loading")}
            </Text>
          </div>
        ) : visibleMeetings.length === 0 ? (
          <div className={styles.emptyStateCard}>
            <Text size="sm" className={styles.emptyStateTitle}>
              {t("meeting_planner.empty_title")}
            </Text>
            <Text size="sm" className={styles.emptyState}>
              {t("meeting_planner.empty_description")}
            </Text>
            <Button
              size="sm"
              kind="secondary"
              onClick={() => {
                void navigate("/meetings/new");
              }}
            >
              {t("meeting_planner.open_schedule_flow")}
            </Button>
          </div>
        ) : (
          visibleMeetings.map((meeting) => (
            <article key={meeting.id} className={styles.meetingCard}>
              <div className={styles.meetingPrimary}>
                <div className={styles.meetingTopRow}>
                  <Text weight="semibold" className={styles.meetingTitle}>
                    {meeting.title}
                  </Text>
                  <span
                    className={[
                      styles.statusBadge,
                      meeting.status === "scheduled"
                        ? styles.scheduled
                        : meeting.status === "live"
                          ? styles.live
                          : styles.ended,
                    ].join(" ")}
                  >
                    {getMeetingStatusLabel(meeting.status, t)}
                  </span>
                </div>
                <Text size="sm" className={styles.meetingTime}>
                  {formatMeetingTime(meeting.startsAt, t)}
                </Text>
                {meeting.description && (
                  <Text size="sm" className={styles.meetingDescription}>
                    {meeting.description}
                  </Text>
                )}
              </div>
              <div className={styles.meetingSecondary}>
                <Text size="sm" className={styles.actionHint}>
                  {meeting.status === "live"
                    ? t("meeting_planner.live_hint")
                    : t("meeting_planner.scheduled_hint")}
                </Text>
                <div className={styles.meetingActions}>
                  {meeting.status === "scheduled" ? (
                    <Button
                      size="sm"
                      kind="primary"
                      onClick={() => {
                        void onStartMeeting(meeting);
                      }}
                    >
                      {t("meeting_planner.start")}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      kind="primary"
                      onClick={() => {
                        void navigate(meeting.joinUrl);
                      }}
                    >
                      {t("meeting_planner.join")}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    kind="secondary"
                    onClick={() => {
                      void onCopyMeetingLink(meeting);
                    }}
                  >
                    {copiedMeetingId === meeting.id
                      ? t("action.copied")
                      : t("action.copy_link")}
                  </Button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
};

function formatMeetingTime(
  startsAt: string | null,
  t: TFunction,
): string {
  if (!startsAt) {
    return t("meeting_planner.no_start_time");
  }

  const startDate = new Date(startsAt);
  const now = new Date();
  const dayDifference = getCalendarDayDifference(now, startDate);
  const timeLabel = new Intl.DateTimeFormat(undefined, {
    timeStyle: "short",
  }).format(startDate);

  if (dayDifference === 0) {
    return t("meeting_planner.today_time", { time: timeLabel });
  }

  if (dayDifference === 1) {
    return t("meeting_planner.tomorrow_time", { time: timeLabel });
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(startDate);
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

function getMeetingStatusRank(status: Meeting["status"]): number {
  switch (status) {
    case "live":
      return 0;
    case "scheduled":
      return 1;
    case "draft":
      return 2;
    case "ended":
    default:
      return 3;
  }
}

function getCalendarDayDifference(left: Date, right: Date): number {
  const leftAtMidnight = new Date(left);
  leftAtMidnight.setHours(0, 0, 0, 0);

  const rightAtMidnight = new Date(right);
  rightAtMidnight.setHours(0, 0, 0, 0);

  return Math.round(
    (rightAtMidnight.getTime() - leftAtMidnight.getTime()) / 86_400_000,
  );
}
