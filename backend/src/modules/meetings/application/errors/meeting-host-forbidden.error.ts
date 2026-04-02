import { HttpStatus } from "@nestjs/common";
import { ApplicationError } from "../../../../common/errors/application-error";

export class MeetingHostForbiddenError extends ApplicationError {
  constructor() {
    super(
      "Only the meeting host can manage this meeting.",
      HttpStatus.FORBIDDEN,
    );
  }
}
