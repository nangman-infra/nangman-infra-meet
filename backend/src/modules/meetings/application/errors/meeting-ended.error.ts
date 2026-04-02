import { HttpStatus } from "@nestjs/common";
import { ApplicationError } from "../../../../common/errors/application-error";

export class MeetingEndedError extends ApplicationError {
  constructor() {
    super("This meeting has already ended.", HttpStatus.CONFLICT);
  }
}
