import { HttpStatus } from "@nestjs/common";
import { ApplicationError } from "../../../../common/errors/application-error";

const INVALID_MEETING_START_TIME_MESSAGE =
  "Scheduled meetings must start in the future.";

export class InvalidMeetingStartTimeError extends ApplicationError {
  constructor() {
    super(INVALID_MEETING_START_TIME_MESSAGE, HttpStatus.BAD_REQUEST);
  }
}
