/*
Copyright 2026 Nangman Infra

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
*/

import {
  useState,
  type FC,
  type FormEvent,
  type FormEventHandler,
} from "react";
import { type MatrixClient } from "matrix-js-sdk";
import { useTranslation } from "react-i18next";
import { Button } from "@vector-im/compound-web";

import { Form } from "../form/Form";
import { ErrorMessage, FieldRow, InputField } from "../input/Input";
import {
  formatAllowedUserIdsInput,
  parseAllowedUserIdsInput,
} from "../domains/meetings/application/meetingPolicy";
import {
  createRoom,
  getRelativeRoomUrl,
  sanitiseRoomNameInput,
} from "../utils/matrix";
import { E2eeType } from "../e2ee/e2eeType";
import { createMeeting } from "../domains/meetings/infrastructure/MeetingsApi";
import type { Meeting } from "../domains/meetings/domain/Meeting";
import styles from "./MeetingScheduler.module.css";

interface Props {
  client: MatrixClient;
  onCancel?: () => void;
  onScheduled?: (meeting: Meeting) => void | Promise<void>;
}

interface ScheduleFormState {
  readonly date: string;
  readonly time: string;
}

interface MeetingPolicyFormState {
  readonly accessPolicy: Meeting["accessPolicy"];
  readonly allowJoinBeforeHost: boolean;
  readonly allowedUserIdsText: string;
}

const FIFTEEN_MINUTES_IN_SECONDS = 900;

export const MeetingScheduler: FC<Props> = ({
  client,
  onCancel,
  onScheduled,
}) => {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<Error>();
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState>(() =>
    getDefaultScheduleValues(),
  );
  const [policyForm, setPolicyForm] = useState<MeetingPolicyFormState>({
    accessPolicy: "open",
    allowJoinBeforeHost: false,
    allowedUserIdsText: "",
  });

  const minimumStartTime = getMinimumScheduleTimeForDate(scheduleForm.date);

  const onSubmit: FormEventHandler<HTMLFormElement> = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setFormError(undefined);
    const form = event.currentTarget;

    const formData = new FormData(form);
    const titleInput = formData.get("meetingTitle");
    const descriptionInput = formData.get("meetingDescription");

    const title =
      typeof titleInput === "string" ? sanitiseRoomNameInput(titleInput) : "";
    const description =
      typeof descriptionInput === "string" && descriptionInput.trim().length > 0
        ? descriptionInput.trim()
        : undefined;
    const allowedUserIds = parseAllowedUserIdsInput(
      policyForm.allowedUserIdsText,
    );

    if (!title) {
      setFormError(new Error(t("meeting_planner.errors.title_required")));
      return;
    }

    if (!scheduleForm.date || !scheduleForm.time) {
      setFormError(new Error(t("meeting_planner.errors.start_required")));
      return;
    }

    const startsAt = combineMeetingStartAt(scheduleForm.date, scheduleForm.time);

    if (!startsAt || !isFutureMeetingStartAt(startsAt, new Date())) {
      setFormError(new Error(t("meeting_planner.errors.future_start_required")));
      return;
    }

    if (policyForm.accessPolicy === "invite_only" && allowedUserIds.length === 0) {
      setFormError(
        new Error(t("meeting_scheduler.errors.allowed_users_required")),
      );
      return;
    }

    async function submitMeeting(): Promise<void> {
      setSubmitting(true);

      const createRoomResult = await createRoom(
        client,
        title,
        E2eeType.SHARED_KEY,
      );

      if (!createRoomResult.password) {
        throw new Error(t("meeting_planner.errors.joinable_room_failed"));
      }

      const joinUrl = getRelativeRoomUrl(
        createRoomResult.roomId,
        {
          kind: E2eeType.SHARED_KEY,
          secret: createRoomResult.password,
        },
        title,
      );

      const meeting = await createMeeting(
        {
          title,
          description,
          hostUserId: client.getUserId() ?? "unknown-user",
          allowedUserIds,
          roomId: createRoomResult.roomId,
          roomAlias: createRoomResult.alias,
          joinUrl,
          startsAt,
          accessPolicy: policyForm.accessPolicy,
          allowJoinBeforeHost: policyForm.allowJoinBeforeHost,
        },
        {
          userId: client.getUserId() ?? undefined,
        },
      );

      form.reset();
      setScheduleForm(getDefaultScheduleValues());
      setPolicyForm({
        accessPolicy: "open",
        allowJoinBeforeHost: false,
        allowedUserIdsText: formatAllowedUserIdsInput([]),
      });
      await onScheduled?.(meeting);
    }

    void submitMeeting()
      .catch((nextError) => {
        setFormError(
          nextError instanceof Error
            ? nextError
            : new Error(t("meeting_planner.errors.schedule_failed")),
        );
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <Form className={styles.form} onSubmit={onSubmit} noValidate>
      <FieldRow>
        <InputField
          id="meetingTitle"
          name="meetingTitle"
          label={t("meeting_planner.title_label")}
          placeholder={t("meeting_planner.title_placeholder")}
          type="text"
          required
          autoComplete="off"
          onChange={() => {
            setFormError(undefined);
          }}
        />
      </FieldRow>
      <FieldRow>
        <InputField
          id="meetingDescription"
          name="meetingDescription"
          label={t("meeting_planner.description_label")}
          placeholder={t("meeting_planner.description_placeholder")}
          type="textarea"
          onChange={() => {
            setFormError(undefined);
          }}
        />
      </FieldRow>
      <FieldRow className={styles.scheduleRow}>
        <InputField
          id="meetingStartDate"
          name="meetingStartDate"
          label={t("meeting_planner.date_label")}
          type="date"
          value={scheduleForm.date}
          min={getCurrentScheduleFloor().date}
          onChange={(event) => {
            const nextDate = event.target.value;
            setFormError(undefined);
            setScheduleForm((current) => ({
              date: nextDate,
              time: normalizeScheduleTime(nextDate, current.time),
            }));
          }}
          required
        />
        <InputField
          id="meetingStartTime"
          name="meetingStartTime"
          label={t("meeting_planner.time_label")}
          type="time"
          value={scheduleForm.time}
          min={minimumStartTime}
          step={FIFTEEN_MINUTES_IN_SECONDS}
          onChange={(event) => {
            setFormError(undefined);
            setScheduleForm((current) => ({
              ...current,
              time: event.target.value,
            }));
          }}
          required
        />
      </FieldRow>
      <FieldRow>
        <div className={styles.optionGroup}>
          <p className={styles.sectionLabel}>
            {t("meeting_scheduler.form.access_policy_label")}
          </p>
          <div className={styles.optionButtons}>
            {(["open", "host_approval", "invite_only"] as const).map((value) => (
              <Button
                key={value}
                type="button"
                kind={policyForm.accessPolicy === value ? "primary" : "secondary"}
                size="sm"
                onClick={() => {
                  setFormError(undefined);
                  setPolicyForm((current) => ({
                    ...current,
                    accessPolicy: value,
                  }));
                }}
              >
                {t(`meeting_detail.access_policy.${value}`)}
              </Button>
            ))}
          </div>
          <p className={styles.helpText}>
            {t(`meeting_scheduler.policy_help.${policyForm.accessPolicy}`)}
          </p>
        </div>
      </FieldRow>
      <FieldRow>
        <InputField
          id="meetingAllowJoinBeforeHost"
          name="meetingAllowJoinBeforeHost"
          type="checkbox"
          label={t("meeting_detail.form.allow_join_before_host")}
          checked={policyForm.allowJoinBeforeHost}
          onChange={(event) => {
            setFormError(undefined);
            setPolicyForm((current) => ({
              ...current,
              allowJoinBeforeHost: event.target.checked,
            }));
          }}
        />
      </FieldRow>
      {policyForm.accessPolicy === "invite_only" && (
        <FieldRow>
          <InputField
            id="meetingAllowedUserIds"
            name="meetingAllowedUserIds"
            label={t("meeting_scheduler.form.allowed_user_ids_label")}
            description={t("meeting_scheduler.form.allowed_user_ids_description")}
            placeholder={t("meeting_scheduler.form.allowed_user_ids_placeholder")}
            type="textarea"
            value={policyForm.allowedUserIdsText}
            onChange={(event) => {
              setFormError(undefined);
              setPolicyForm((current) => ({
                ...current,
                allowedUserIdsText: event.target.value,
              }));
            }}
          />
        </FieldRow>
      )}
      <p className={styles.timezoneHint}>
        {t("meeting_scheduler.timezone_hint", {
          timezone: new Intl.DateTimeFormat().resolvedOptions().timeZone,
        })}
      </p>
      {formError && (
        <FieldRow>
          <ErrorMessage error={formError} />
        </FieldRow>
      )}
      <FieldRow rightAlign className={styles.actions}>
        {onCancel && (
          <Button type="button" kind="secondary" onClick={onCancel}>
            {t("action.cancel")}
          </Button>
        )}
        <Button type="submit" kind="primary" disabled={submitting}>
          {submitting
            ? t("meeting_planner.scheduling")
            : t("meeting_planner.schedule")}
        </Button>
      </FieldRow>
    </Form>
  );
};

function combineMeetingStartAt(
  startDateInput: string,
  startTimeInput: string,
): string | undefined {
  const startDate = startDateInput.trim();
  const startTime = startTimeInput.trim();

  if (!startDate || !startTime) {
    return undefined;
  }

  return new Date(`${startDate}T${startTime}`).toISOString();
}

function getDefaultScheduleValues(): ScheduleFormState {
  const defaultStartAt = getNextScheduleFloor();
  return {
    date: formatDateInputValue(defaultStartAt),
    time: formatTimeInputValue(defaultStartAt),
  };
}

function getCurrentScheduleFloor(): ScheduleFormState {
  const currentScheduleFloor = getNextScheduleFloor();
  return {
    date: formatDateInputValue(currentScheduleFloor),
    time: formatTimeInputValue(currentScheduleFloor),
  };
}

function getNextScheduleFloor(): Date {
  const defaultStartAt = new Date();
  if (defaultStartAt.getMinutes() < 30) {
    defaultStartAt.setMinutes(30, 0, 0);
  } else {
    defaultStartAt.setHours(defaultStartAt.getHours() + 1);
    defaultStartAt.setMinutes(0, 0, 0);
  }

  return defaultStartAt;
}

function getMinimumScheduleTimeForDate(selectedDate: string): string | undefined {
  const currentScheduleFloor = getCurrentScheduleFloor();
  if (selectedDate === currentScheduleFloor.date) {
    return currentScheduleFloor.time;
  }

  return undefined;
}

function normalizeScheduleTime(selectedDate: string, selectedTime: string): string {
  const minimumScheduleTime = getMinimumScheduleTimeForDate(selectedDate);
  if (!minimumScheduleTime || selectedTime >= minimumScheduleTime) {
    return selectedTime;
  }

  return minimumScheduleTime;
}

function isFutureMeetingStartAt(startsAt: string, now: Date): boolean {
  return new Date(startsAt).getTime() > now.getTime();
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
