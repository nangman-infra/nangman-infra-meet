import { HttpStatus } from "@nestjs/common";
import { ApplicationError } from "../../../../common/errors/application-error";

export class MeetingAccessRequestNotFoundError extends ApplicationError {
  constructor(requestId: string) {
    super(`Meeting access request ${requestId} was not found.`, HttpStatus.NOT_FOUND);
  }
}
