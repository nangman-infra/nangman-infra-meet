import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const meetingStatusEnum = pgEnum("meeting_status", [
  "draft",
  "scheduled",
  "live",
  "ended",
  "cancelled",
]);

export const meetingAccessPolicyEnum = pgEnum("meeting_access_policy", [
  "open",
  "host_approval",
  "invite_only",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "left",
]);

export const accessRequestStatusEnum = pgEnum("access_request_status", [
  "pending",
  "approved",
  "rejected",
]);

export const meetings = pgTable(
  "meetings",
  {
    id: uuid("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    hostUserId: text("host_user_id").notNull(),
    allowedUserIds: jsonb("allowed_user_ids")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    roomId: text("room_id").notNull(),
    roomAlias: text("room_alias"),
    joinUrl: text("join_url").notNull(),
    accessPolicy: meetingAccessPolicyEnum("access_policy")
      .notNull()
      .default("open"),
    allowJoinBeforeHost: boolean("allow_join_before_host")
      .notNull()
      .default(false),
    status: meetingStatusEnum("status").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }),
    endsAt: timestamp("ends_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    hostUserIdIdx: index("meetings_host_user_id_idx").on(table.hostUserId),
    startsAtIdx: index("meetings_starts_at_idx").on(table.startsAt),
    statusIdx: index("meetings_status_idx").on(table.status),
  }),
);

export const attendances = pgTable(
  "attendances",
  {
    id: uuid("id").primaryKey(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    status: attendanceStatusEnum("status").notNull(),
    joinedAt: timestamp("joined_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    lastSeenAt: timestamp("last_seen_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    leftAt: timestamp("left_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    meetingIdIdx: index("attendances_meeting_id_idx").on(table.meetingId),
    meetingUserStatusIdx: index("attendances_meeting_user_status_idx").on(
      table.meetingId,
      table.userId,
      table.status,
    ),
  }),
);

export const meetingAccessRequests = pgTable(
  "meeting_access_requests",
  {
    id: uuid("id").primaryKey(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    status: accessRequestStatusEnum("status").notNull(),
    requestedAt: timestamp("requested_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    respondedAt: timestamp("responded_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    meetingIdIdx: index("meeting_access_requests_meeting_id_idx").on(
      table.meetingId,
    ),
    meetingUserUpdatedAtIdx: index(
      "meeting_access_requests_meeting_user_updated_at_idx",
    ).on(table.meetingId, table.userId, table.updatedAt),
  }),
);
