import { HttpStatus } from "@nestjs/common";
import { ApplicationError } from "../../../../common/errors/application-error";

export class MeetingVisibilityForbiddenError extends ApplicationError {
  constructor() {
    super("You do not have access to this meeting.", HttpStatus.FORBIDDEN);
  }
}
