import type { AppLogger } from "../src/common/logging/app-logger.service";
import { runWithRequestContext } from "../src/common/request-context/request-context";
import { InMemoryMeetingRepository } from "../src/modules/meetings/infrastructure/repositories/in-memory-meeting.repository";
import { CreateMeetingUseCase } from "../src/modules/meetings/application/use-cases/create-meeting.use-case";

describe("CreateMeetingUseCase", () => {
  it("logs a warning when the declared host user differs from the actor user", async () => {
    const repository = new InMemoryMeetingRepository();
    const mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    const useCase = new CreateMeetingUseCase(
      repository,
      mockLogger as unknown as AppLogger,
    );

    await runWithRequestContext(
      {
        requestId: "req_test",
        traceId: "trace_test",
        userId: "@alice:matrix.nangman.cloud",
      },
      async () => {
        await useCase.execute({
          title: "Infra planning",
          hostUserId: "@bob:matrix.nangman.cloud",
          roomId: "!room:matrix.nangman.cloud",
          joinUrl: "/room/infra-planning",
        });
      },
    );

    expect(mockLogger.warn).toHaveBeenCalledWith(
      "meeting.host_user_mismatch",
      expect.objectContaining({
        actorUserId: "@alice:matrix.nangman.cloud",
        hostUserId: "@bob:matrix.nangman.cloud",
        meetingId: expect.any(String),
        result: "soft_validation_failed",
      }),
    );
  });

  it("does not warn when the actor user matches the declared host user", async () => {
    const repository = new InMemoryMeetingRepository();
    const mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    const useCase = new CreateMeetingUseCase(
      repository,
      mockLogger as unknown as AppLogger,
    );

    await runWithRequestContext(
      {
        requestId: "req_test",
        traceId: "trace_test",
        userId: "@alice:matrix.nangman.cloud",
      },
      async () => {
        await useCase.execute({
          title: "Infra planning",
          hostUserId: "@alice:matrix.nangman.cloud",
          roomId: "!room:matrix.nangman.cloud",
          joinUrl: "/room/infra-planning",
        });
      },
    );

    expect(mockLogger.warn).not.toHaveBeenCalled();
  });
});
