CREATE TABLE "group_admin_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"target_id" uuid,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_content_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"details" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_reports_target_check" CHECK ("group_content_reports"."target_type" in ('job_share', 'message')),
	CONSTRAINT "group_reports_status_check" CHECK ("group_content_reports"."status" in ('open', 'dismissed', 'actioned')),
	CONSTRAINT "group_reports_reason_check" CHECK ("group_content_reports"."reason" in ('off_topic', 'spam', 'harmful', 'other'))
);
--> statement-breakpoint
ALTER TABLE "job_shares" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "group_admin_events" ADD CONSTRAINT "group_admin_events_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_admin_events" ADD CONSTRAINT "group_admin_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_content_reports" ADD CONSTRAINT "group_content_reports_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_content_reports" ADD CONSTRAINT "group_content_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_content_reports" ADD CONSTRAINT "group_content_reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "group_admin_events_group_created_idx" ON "group_admin_events" USING btree ("group_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "group_reports_reporter_target_unique" ON "group_content_reports" USING btree ("group_id","reporter_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "group_reports_status_idx" ON "group_content_reports" USING btree ("group_id","status");--> statement-breakpoint
CREATE VIEW "public"."active_job_shares" AS (select "id", "group_id", "job_id", "sharer_id", "note", "archived_at", "shared_at" from "job_shares" where "job_shares"."archived_at" is null);