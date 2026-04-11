/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import {
  useCallback,
  useEffect,
  useState,
  type FC,
  type ReactElement,
} from "react";
import { type TFunction } from "i18next";
import { logger } from "matrix-js-sdk/lib/logger";
import { useTranslation } from "react-i18next";
import { Button, Heading, Text } from "@vector-im/compound-web";
import { useNavigate } from "react-router-dom";

import { useClient } from "../ClientContext";
import {
  listMeetings,
  listMeetingAttendanceSummaries,
  startMeeting,
} from "../domains/meetings/infrastructure/MeetingsApi";
import { type Meeting } from "../domains/meetings/domain/Meeting";
import { type MeetingAttendanceSummary } from "../domains/meetings/domain/MeetingAttendanceSummary";
import { ErrorMessage } from "../input/Input";
import { fireAndForget } from "../utils/fireAndForget";
import styles from "./MeetingPlanner.module.css";

const COPY_TOAST_TIMEOUT_MS = 1_800;
const meetingPlannerLogger = logger.getChild("[MeetingPlanner]");

export const MeetingPlanner: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { client } = useClient();
  const currentUserId = client?.getUserId() ?? undefined;
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendanceSummaries, setAttendanceSummaries] = useState<
    Record<string, MeetingAttendanceSummary>
  >({});
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [copiedMeetingId, setCopiedMeetingId] = useState<string>();
  const [listError, setListError] = useState<Error>();

  const loadMeetings = useCallback(async (): Promise<void> => {
    setLoadingMeetings(true);
    try {
      setListError(undefined);
      const nextMeetings = await listMeetings({
        userId: currentUserId,
      });
      setMeetings(nextMeetings);

      const summaryMeetingIds = nextMeetings
        .filter((meeting) => meeting.status === "live")
        .map((meeting) => meeting.id);

      if (summaryMeetingIds.length === 0) {
        setAttendanceSummaries({});
        return;
      }

      try {
        const summaries = await listMeetingAttendanceSummaries(
          summaryMeetingIds,
          {
            userId: currentUserId,
          },
        );
        setAttendanceSummaries(
          Object.fromEntries(
            summaries.map((summary) => [summary.meetingId, summary]),
          ),
        );
      } catch (error) {
        setAttendanceSummaries({});
        meetingPlannerLogger.warn("meeting_attendance_summary_load_failed", {
          meetingIds: summaryMeetingIds,
          error:
            error instanceof Error
              ? error.message
              : t("meeting_planner.errors.load_failed"),
        });
      }
    } catch (nextError) {
      setAttendanceSummaries({});
      setListError(
        nextError instanceof Error
          ? nextError
          : new Error(t("meeting_planner.errors.load_failed")),
      );
    } finally {
      setLoadingMeetings(false);
    }
  }, [currentUserId, t]);

  useEffect(() => {
    fireAndForget(loadMeetings(), "Failed to load meetings");
  }, [loadMeetings]);

  useEffect(() => {
    if (!copiedMeetingId) return;

    const timeoutId = window.setTimeout(() => {
      setCopiedMeetingId(undefined);
    }, COPY_TOAST_TIMEOUT_MS);

    return (): void => {
      window.clearTimeout(timeoutId);
    };
  }, [copiedMeetingId]);

  async function onStartMeeting(meeting: Meeting): Promise<void> {
    setListError(undefined);
    try {
      await startMeeting(meeting.id, {
        userId: currentUserId,
      });
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

      const joinUrl = new URL(
        meeting.joinUrl,
        window.location.origin,
      ).toString();
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
    (meeting) => meeting.status !== "ended" && meeting.status !== "cancelled",
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
      </div>

      {listError && (
        <div className={styles.listError}>
          <ErrorMessage error={listError} />
        </div>
      )}

      <div className={styles.meetingsList} aria-busy={loadingMeetings}>
        {loadingMeetings ? (
          <MeetingPlannerSkeleton />
        ) : visibleMeetings.length === 0 ? (
          <div className={styles.emptyStateCard}>
            <Text size="sm" className={styles.emptyStateTitle}>
              {t("meeting_planner.empty_title")}
            </Text>
            <Text size="sm" className={styles.emptyState}>
              {t("meeting_planner.empty_description")}
            </Text>
          </div>
        ) : (
          visibleMeetings.map((meeting) => {
            const isMeetingHost = meeting.hostUserId === currentUserId;
            const primaryActionLabel =
              meeting.status === "scheduled" && !isMeetingHost
                ? t("meeting_planner.view_details")
                : meeting.status === "scheduled" && isMeetingHost
                  ? t("meeting_planner.start")
                  : t("meeting_planner.join");

            return (
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
                  <div className={styles.metaPills}>
                    <span className={styles.metaPill}>
                      {t("meeting_planner.role_summary", {
                        role: isMeetingHost
                          ? t("meeting_planner.role.host")
                          : t("meeting_planner.role.participant"),
                      })}
                    </span>
                    <span className={styles.metaPill}>
                      {t("meeting_planner.access_summary", {
                        access: t(
                          `meeting_detail.access_policy.${meeting.accessPolicy}`,
                        ),
                      })}
                    </span>
                  </div>
                  <Text size="sm" className={styles.meetingTime}>
                    {formatMeetingTime(meeting.startsAt, t)}
                  </Text>
                  {meeting.status === "live" && (
                    <Text size="sm" className={styles.attendanceSummary}>
                      {formatMeetingAttendanceSummary(
                        attendanceSummaries[meeting.id],
                        t,
                      )}
                    </Text>
                  )}
                  {meeting.description && (
                    <Text size="sm" className={styles.meetingDescription}>
                      {meeting.description}
                    </Text>
                  )}
                </div>
                <div className={styles.meetingSecondary}>
                  <div className={styles.meetingActions}>
                    {isMeetingHost && (
                      <Button
                        size="sm"
                        kind="secondary"
                        onClick={() => {
                          fireAndForget(
                            navigate(`/meetings/${meeting.id}`),
                            "Failed to open meeting management page",
                          );
                        }}
                      >
                        {t("meeting_planner.manage")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      kind="primary"
                      onClick={() => {
                        if (meeting.status === "scheduled" && isMeetingHost) {
                          fireAndForget(
                            onStartMeeting(meeting),
                            "Failed to start meeting",
                          );
                          return;
                        }

                        if (meeting.status === "scheduled" && !isMeetingHost) {
                          fireAndForget(
                            navigate(`/meetings/${meeting.id}`),
                            "Failed to open meeting details",
                          );
                          return;
                        }

                        fireAndForget(
                          navigate(meeting.joinUrl),
                          "Failed to join meeting",
                        );
                      }}
                    >
                      {primaryActionLabel}
                    </Button>
                    <Button
                      size="sm"
                      kind="secondary"
                      onClick={() => {
                        fireAndForget(
                          onCopyMeetingLink(meeting),
                          "Failed to copy meeting link",
                        );
                      }}
                    >
                      {copiedMeetingId === meeting.id
                        ? t("action.copied")
                        : t("action.copy_link")}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
};

const SKELETON_CARD_COUNT = 3;

function MeetingPlannerSkeleton(): ReactElement {
  return (
    <div
      className={styles.skeletonList}
      data-testid="meeting-planner-skeleton"
      aria-label="Loading meetings"
    >
      {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
        <article
          key={`meeting-skeleton-${index}`}
          className={[styles.meetingCard, styles.meetingCardSkeleton].join(" ")}
          aria-hidden="true"
        >
          <div className={styles.meetingPrimary}>
            <div className={styles.meetingTopRow}>
              <span
                className={[
                  styles.skeletonBlock,
                  styles.skeletonTitle,
                ].join(" ")}
              />
              <span
                className={[
                  styles.skeletonBlock,
                  styles.skeletonBadge,
                ].join(" ")}
              />
            </div>
            <div className={styles.metaPills}>
              <span
                className={[
                  styles.skeletonBlock,
                  styles.skeletonMetaPill,
                ].join(" ")}
              />
              <span
                className={[
                  styles.skeletonBlock,
                  styles.skeletonMetaPill,
                ].join(" ")}
              />
            </div>
            <span
              className={[styles.skeletonBlock, styles.skeletonTime].join(" ")}
            />
            <span
              className={[styles.skeletonBlock, styles.skeletonSummary].join(" ")}
            />
            <span
              className={[
                styles.skeletonBlock,
                styles.skeletonDescription,
              ].join(" ")}
            />
          </div>
          <div className={styles.meetingSecondary}>
            <div className={styles.meetingActions}>
              <span
                className={[styles.skeletonBlock, styles.skeletonButton].join(" ")}
              />
              <span
                className={[styles.skeletonBlock, styles.skeletonButton].join(" ")}
              />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function formatMeetingTime(startsAt: string | null, t: TFunction): string {
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

function formatMeetingAttendanceSummary(
  summary: MeetingAttendanceSummary | undefined,
  t: TFunction,
): string {
  if (!summary) {
    return t("meeting_planner.attendance.none_present");
  }

  const segments =
    summary.presentCount === 0
      ? [t("meeting_planner.attendance.none_present")]
      : [
          t("meeting_planner.attendance.present_count", {
            count: summary.presentCount,
          }),
        ];

  if (summary.participantCount > summary.presentCount) {
    segments.push(
      t("meeting_planner.attendance.participant_count", {
        count: summary.participantCount,
      }),
    );
  }

  return segments.join(" · ");
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
    case "cancelled":
      return t("meeting_planner.status.cancelled");
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
    case "cancelled":
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
