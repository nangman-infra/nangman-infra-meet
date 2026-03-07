import { HttpStatus } from "@nestjs/common";
import { ApplicationError } from "../../../../common/errors/application-error";

export class MeetingNotFoundError extends ApplicationError {
  constructor(meetingId: string) {
    super(`Meeting ${meetingId} was not found.`, HttpStatus.NOT_FOUND);
  }
}
