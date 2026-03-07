import {
  useEffect,
  useState,
  type FC,
  type FormEvent,
  type FormEventHandler,
} from "react";
import { type MatrixClient } from "matrix-js-sdk";
import { Button, Heading, Text } from "@vector-im/compound-web";
import { useNavigate } from "react-router-dom";

import { Form } from "../form/Form";
import { ErrorMessage, FieldRow, InputField } from "../input/Input";
import {
  createRoom,
  getRelativeRoomUrl,
  sanitiseRoomNameInput,
} from "../utils/matrix";
import { E2eeType } from "../e2ee/e2eeType";
import {
  createMeeting,
  listMeetings,
  startMeeting,
} from "../domains/meetings/infrastructure/MeetingsApi";
import { Meeting } from "../domains/meetings/domain/Meeting";
import styles from "./MeetingPlanner.module.css";

interface Props {
  client: MatrixClient;
}

export const MeetingPlanner: FC<Props> = ({ client }) => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error>();

  async function loadMeetings(): Promise<void> {
    setLoadingMeetings(true);
    try {
      setMeetings(await listMeetings());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError : new Error("Failed to load meetings"));
    } finally {
      setLoadingMeetings(false);
    }
  }

  useEffect(() => {
    void loadMeetings();
  }, []);

  const onSubmit: FormEventHandler<HTMLFormElement> = (
    event: FormEvent<HTMLFormElement>,
  ) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const titleInput = formData.get("meetingTitle");
      const descriptionInput = formData.get("meetingDescription");
      const startAtInput = formData.get("meetingStartAt");

      const title =
        typeof titleInput === "string" ? sanitiseRoomNameInput(titleInput) : "";
      const description =
        typeof descriptionInput === "string" && descriptionInput.trim().length > 0
          ? descriptionInput.trim()
          : undefined;
      const startsAt =
        typeof startAtInput === "string" && startAtInput.length > 0
          ? new Date(startAtInput).toISOString()
          : undefined;

      async function submitMeeting(): Promise<void> {
        setSubmitting(true);
        setError(undefined);

        const createRoomResult = await createRoom(
          client,
          title,
          E2eeType.SHARED_KEY,
        );

        if (!createRoomResult.password) {
          throw new Error("Failed to create a joinable room for the meeting.");
        }

        const joinUrl = getRelativeRoomUrl(
          createRoomResult.roomId,
          {
            kind: E2eeType.SHARED_KEY,
            secret: createRoomResult.password,
          },
          title,
        );

        await createMeeting({
          title,
          description,
          hostUserId: client.getUserId() ?? "unknown-user",
          roomId: createRoomResult.roomId,
          roomAlias: createRoomResult.alias,
          joinUrl,
          startsAt,
          allowJoinBeforeHost: false,
        });

        event.currentTarget.reset();
        await loadMeetings();
      }

      void submitMeeting()
        .catch((nextError) => {
          setError(
            nextError instanceof Error
              ? nextError
              : new Error("Failed to schedule meeting"),
          );
        })
        .finally(() => {
          setSubmitting(false);
        });
    };

  async function onStartMeeting(meeting: Meeting): Promise<void> {
    setError(undefined);
    try {
      await startMeeting(meeting.id);
      await loadMeetings();
      await navigate(meeting.joinUrl);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError
          : new Error("Failed to start meeting"),
      );
    }
  }

  const sortedMeetings = [...meetings].sort((left, right) => {
    const leftSortKey = left.startsAt ?? left.createdAt;
    const rightSortKey = right.startsAt ?? right.createdAt;
    return leftSortKey.localeCompare(rightSortKey);
  });

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <Heading size="md" weight="semibold">
          Meetings
        </Heading>
        <Text size="sm" className={styles.sectionDescription}>
          Schedule a meeting, keep the join link, and start it when you are ready.
        </Text>
      </div>
      <Form className={styles.form} onSubmit={onSubmit}>
        <FieldRow>
          <InputField
            id="meetingTitle"
            name="meetingTitle"
            label="Meeting title"
            placeholder="Weekly infra sync"
            type="text"
            required
            autoComplete="off"
          />
        </FieldRow>
        <FieldRow>
          <InputField
            id="meetingDescription"
            name="meetingDescription"
            label="Description"
            placeholder="Agenda or context"
            type="textarea"
          />
        </FieldRow>
        <FieldRow>
          <InputField
            id="meetingStartAt"
            name="meetingStartAt"
            label="Starts at"
            type="datetime-local"
            required
          />
        </FieldRow>
        <FieldRow className={styles.formActions}>
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? "Scheduling..." : "Schedule meeting"}
          </Button>
        </FieldRow>
        {error && (
          <FieldRow>
            <ErrorMessage error={error} />
          </FieldRow>
        )}
      </Form>

      <div className={styles.meetingsList}>
        {loadingMeetings ? (
          <Text size="sm" className={styles.emptyState}>
            Loading meetings...
          </Text>
        ) : sortedMeetings.length === 0 ? (
          <Text size="sm" className={styles.emptyState}>
            No meetings have been scheduled yet.
          </Text>
        ) : (
          sortedMeetings.map((meeting) => (
            <article key={meeting.id} className={styles.meetingCard}>
              <div className={styles.meetingCardHeader}>
                <div className={styles.meetingMeta}>
                  <Text weight="semibold">{meeting.title}</Text>
                  <Text size="sm" className={styles.sectionDescription}>
                    {formatMeetingTime(meeting.startsAt)}
                  </Text>
                  {meeting.description && (
                    <Text size="sm">{meeting.description}</Text>
                  )}
                </div>
                <div className={styles.badgeRow}>
                  <span
                    className={[
                      styles.statusBadge,
                      meeting.status === "scheduled"
                        ? styles.scheduled
                        : meeting.status === "live"
                          ? styles.live
                          : meeting.status === "ended"
                            ? styles.ended
                            : "",
                    ].join(" ")}
                  >
                    {getMeetingStatusLabel(meeting.status)}
                  </span>
                </div>
              </div>
              <div className={styles.meetingActions}>
                {meeting.status === "scheduled" ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      void onStartMeeting(meeting);
                    }}
                  >
                    Start meeting
                  </Button>
                ) : meeting.status === "live" ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      void navigate(meeting.joinUrl);
                    }}
                  >
                    Join meeting
                  </Button>
                ) : (
                  <Button size="sm" disabled>
                    Meeting ended
                  </Button>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
};

function formatMeetingTime(startsAt: string | null): string {
  if (!startsAt) {
    return "No start time";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(startsAt));
}

function getMeetingStatusLabel(status: Meeting["status"]): string {
  switch (status) {
    case "scheduled":
      return "Scheduled";
    case "live":
      return "Live";
    case "ended":
      return "Ended";
    default:
      return "Draft";
  }
}
