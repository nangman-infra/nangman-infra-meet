import type { AppLogger } from "../src/common/logging/app-logger.service";
import { runWithRequestContext } from "../src/common/request-context/request-context";
import { Meeting } from "../src/modules/meetings/domain/meeting.entity";
import { InMemoryMeetingRepository } from "../src/modules/meetings/infrastructure/repositories/in-memory-meeting.repository";
import { UpdateMeetingUseCase } from "../src/modules/meetings/application/use-cases/update-meeting.use-case";

describe("UpdateMeetingUseCase", () => {
  it("logs a warning when the actor user differs from the meeting host", async () => {
    const repository = new InMemoryMeetingRepository();
    const mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    const useCase = new UpdateMeetingUseCase(
      repository,
      mockLogger as unknown as AppLogger,
    );
    const meeting = Meeting.create({
      id: "meeting-1",
      title: "Infra planning",
      description: null,
      hostUserId: "@bob:matrix.nangman.cloud",
      roomId: "!room:matrix.nangman.cloud",
      roomAlias: "#infra:matrix.nangman.cloud",
      joinUrl: "/room/infra-planning",
      accessPolicy: "open",
      allowJoinBeforeHost: false,
      startsAt: new Date("2026-03-20T12:00:00.000Z"),
      now: new Date("2026-03-13T12:00:00.000Z"),
    });
    await repository.save(meeting);

    await runWithRequestContext(
      {
        requestId: "req_test",
        traceId: "trace_test",
        userId: "@alice:matrix.nangman.cloud",
      },
      async () => {
        await useCase.execute("meeting-1", {
          title: "Infra planning updated",
          allowJoinBeforeHost: true,
        });
      },
    );

    expect(mockLogger.warn).toHaveBeenCalledWith(
      "meeting.host_user_mismatch",
      expect.objectContaining({
        actorUserId: "@alice:matrix.nangman.cloud",
        hostUserId: "@bob:matrix.nangman.cloud",
        meetingId: "meeting-1",
        result: "soft_validation_failed",
      }),
    );
  });
});
