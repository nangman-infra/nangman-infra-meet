import { InvalidMeetingStartTimeError } from "../errors/invalid-meeting-start-time.error";

export function assertValidScheduledMeetingStart(
  startsAt: Date | null | undefined,
  now: Date,
): void {
  if (!startsAt) {
    return;
  }

  if (startsAt.getTime() <= now.getTime()) {
    throw new InvalidMeetingStartTimeError();
  }
}
