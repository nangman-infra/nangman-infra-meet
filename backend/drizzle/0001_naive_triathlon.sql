CREATE TYPE "public"."access_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('present', 'left');--> statement-breakpoint
CREATE TABLE "attendances" (
	"id" uuid PRIMARY KEY NOT NULL,
	"meeting_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"status" "attendance_status" NOT NULL,
	"joined_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"left_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_access_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"meeting_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"status" "access_request_status" NOT NULL,
	"requested_at" timestamp with time zone NOT NULL,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_access_requests" ADD CONSTRAINT "meeting_access_requests_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendances_meeting_id_idx" ON "attendances" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "attendances_meeting_user_status_idx" ON "attendances" USING btree ("meeting_id","user_id","status");--> statement-breakpoint
CREATE INDEX "meeting_access_requests_meeting_id_idx" ON "meeting_access_requests" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "meeting_access_requests_meeting_user_updated_at_idx" ON "meeting_access_requests" USING btree ("meeting_id","user_id","updated_at");