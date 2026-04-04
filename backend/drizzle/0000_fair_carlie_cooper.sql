CREATE TYPE "public"."meeting_access_policy" AS ENUM('open', 'host_approval', 'invite_only');--> statement-breakpoint
CREATE TYPE "public"."meeting_status" AS ENUM('draft', 'scheduled', 'live', 'ended', 'cancelled');--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"host_user_id" text NOT NULL,
	"allowed_user_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"room_id" text NOT NULL,
	"room_alias" text,
	"join_url" text NOT NULL,
	"access_policy" "meeting_access_policy" DEFAULT 'open' NOT NULL,
	"allow_join_before_host" boolean DEFAULT false NOT NULL,
	"status" "meeting_status" NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "meetings_host_user_id_idx" ON "meetings" USING btree ("host_user_id");--> statement-breakpoint
CREATE INDEX "meetings_starts_at_idx" ON "meetings" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "meetings_status_idx" ON "meetings" USING btree ("status");