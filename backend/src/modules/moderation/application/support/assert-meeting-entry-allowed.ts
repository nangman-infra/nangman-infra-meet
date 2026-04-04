import { HttpStatus } from "@nestjs/common";
import { ApplicationError } from "../../../../common/errors/application-error";
import { MeetingClosedError } from "../../../meetings/application/errors/meeting-closed.error";
import { MeetingVisibilityForbiddenError } from "../../../meetings/application/errors/meeting-visibility-forbidden.error";
import { MeetingEntryAccessDecision } from "../read-models/meeting-entry-access-decision";

class MeetingWaitForHostError extends ApplicationError {
  constructor() {
    super("This meeting is not open yet.", HttpStatus.CONFLICT);
  }
}

export function assertMeetingEntryAllowed(
  decision: Pick<MeetingEntryAccessDecision, "kind">,
): void {
  switch (decision.kind) {
    case "allow":
      return;
    case "meeting_closed":
      throw new MeetingClosedError();
    case "wait_for_host":
      throw new MeetingWaitForHostError();
    default:
      throw new MeetingVisibilityForbiddenError();
  }
}
