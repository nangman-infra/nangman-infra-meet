export function appendMeetingIdToJoinUrl(
  joinUrl: string,
  meetingId: string,
): string {
  const [pathAndQuery, hash] = joinUrl.split("#", 2);

  if (hash !== undefined) {
    const [hashPath, hashQuery = ""] = hash.split("?", 2);
    const params = new URLSearchParams(hashQuery);
    params.set("meetingId", meetingId);

    return `${pathAndQuery}#${hashPath}?${params.toString()}`;
  }

  const [path, query = ""] = joinUrl.split("?", 2);
  const params = new URLSearchParams(query);
  params.set("meetingId", meetingId);

  return `${path}?${params.toString()}`;
}
