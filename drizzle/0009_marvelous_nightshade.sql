CREATE TABLE "notification_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"in_app_enabled" boolean DEFAULT true NOT NULL,
	"strong_matches_enabled" boolean DEFAULT true NOT NULL,
	"referral_requests_enabled" boolean DEFAULT true NOT NULL,
	"application_reminders_enabled" boolean DEFAULT true NOT NULL,
	"job_activity_enabled" boolean DEFAULT true NOT NULL,
	"group_activity_enabled" boolean DEFAULT true NOT NULL,
	"digest_cadence" text DEFAULT 'weekly' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_digest_cadence_check" CHECK ("notification_preferences"."digest_cadence" in ('daily', 'weekly', 'off'))
);
--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "recipient_user_id" uuid;--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "dedupe_key" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "activity_event_id" uuid;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "action_url" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "dedupe_key" text;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_activity_event_id_activity_events_id_fk" FOREIGN KEY ("activity_event_id") REFERENCES "public"."activity_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_events_recipient_created_idx" ON "activity_events" USING btree ("recipient_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "activity_events_dedupe_key_unique" ON "activity_events" USING btree ("dedupe_key");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_dedupe_key_unique" ON "notifications" USING btree ("dedupe_key");