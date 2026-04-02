import { HttpStatus } from "@nestjs/common";
import { ApplicationError } from "../../../../common/errors/application-error";

export class MeetingActorRequiredError extends ApplicationError {
  constructor() {
    super("Meeting actor user is required.", HttpStatus.BAD_REQUEST);
  }
}
