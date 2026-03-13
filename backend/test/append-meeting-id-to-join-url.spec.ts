import { appendMeetingIdToJoinUrl } from "../src/modules/meetings/application/support/append-meeting-id-to-join-url";

describe("appendMeetingIdToJoinUrl", () => {
  it("adds the meeting id to fragment query params", () => {
    expect(
      appendMeetingIdToJoinUrl(
        "/room/#/infra-planning?roomId=!room:matrix.nangman.cloud&password=secret",
        "meeting-123",
      ),
    ).toBe(
      "/room/#/infra-planning?roomId=%21room%3Amatrix.nangman.cloud&password=secret&meetingId=meeting-123",
    );
  });

  it("adds the meeting id to plain query params", () => {
    expect(
      appendMeetingIdToJoinUrl("/room/live?viaServers=matrix.nangman.cloud", "meeting-123"),
    ).toBe("/room/live?viaServers=matrix.nangman.cloud&meetingId=meeting-123");
  });

  it("adds the meeting id to links without query params", () => {
    expect(appendMeetingIdToJoinUrl("/room/live", "meeting-123")).toBe(
      "/room/live?meetingId=meeting-123",
    );
  });
});
