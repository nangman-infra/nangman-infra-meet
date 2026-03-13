import { HttpStatus } from "@nestjs/common";
import { ApplicationError } from "../../../../common/errors/application-error";

export class ActiveAttendanceNotFoundError extends ApplicationError {
  constructor(meetingId: string, userId: string) {
    super(
      `Active attendance for ${userId} in meeting ${meetingId} was not found.`,
      HttpStatus.NOT_FOUND,
    );
  }
}
