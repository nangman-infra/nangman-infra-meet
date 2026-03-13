export const ACCESS_REQUEST_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;

export type AccessRequestStatus = (typeof ACCESS_REQUEST_STATUSES)[number];
