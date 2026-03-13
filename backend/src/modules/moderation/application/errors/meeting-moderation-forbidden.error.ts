import { HttpStatus } from "@nestjs/common";
import { ApplicationError } from "../../../../common/errors/application-error";

export class MeetingModerationForbiddenError extends ApplicationError {
  constructor() {
    super("Only the meeting host can moderate access requests.", HttpStatus.FORBIDDEN);
  }
}
