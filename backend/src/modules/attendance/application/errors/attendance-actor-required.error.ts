import { HttpStatus } from "@nestjs/common";
import { ApplicationError } from "../../../../common/errors/application-error";

export class AttendanceActorRequiredError extends ApplicationError {
  constructor() {
    super("Attendance actor user is required.", HttpStatus.BAD_REQUEST);
  }
}
