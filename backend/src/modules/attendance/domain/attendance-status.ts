export const ATTENDANCE_STATUSES = ["present", "left"] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
