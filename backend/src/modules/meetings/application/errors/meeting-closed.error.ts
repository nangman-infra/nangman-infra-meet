import { HttpStatus } from "@nestjs/common";
import { ApplicationError } from "../../../../common/errors/application-error";

export class MeetingClosedError extends ApplicationError {
  constructor() {
    super("This meeting is already closed.", HttpStatus.CONFLICT);
  }
}
