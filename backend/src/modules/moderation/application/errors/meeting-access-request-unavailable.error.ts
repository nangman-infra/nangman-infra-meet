import { HttpStatus } from "@nestjs/common";
import { ApplicationError } from "../../../../common/errors/application-error";

export class MeetingAccessRequestUnavailableError extends ApplicationError {
  constructor() {
    super(
      "Access requests are only available for host approval meetings.",
      HttpStatus.BAD_REQUEST,
    );
  }
}
