ALTER TABLE "application_status_events" DROP CONSTRAINT "application_status_events_from_check";--> statement-breakpoint
ALTER TABLE "application_status_events" DROP CONSTRAINT "application_status_events_to_check";--> statement-breakpoint
ALTER TABLE "applications" DROP CONSTRAINT "applications_status_check";--> statement-breakpoint
UPDATE "application_status_events"
SET "from_status" = 'saved'
WHERE "from_status" = 'not_applied';--> statement-breakpoint
UPDATE "application_status_events"
SET "to_status" = 'saved'
WHERE "to_status" = 'not_applied';--> statement-breakpoint
UPDATE "applications"
SET "status" = 'saved'
WHERE "status" = 'not_applied';--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "status" SET DEFAULT 'saved';--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "private_notes" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "next_action" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "next_action_date" date;--> statement-breakpoint
CREATE INDEX "applications_user_next_action_idx" ON "applications" USING btree ("user_id","next_action_date");--> statement-breakpoint
ALTER TABLE "application_status_events" ADD CONSTRAINT "application_status_events_from_check" CHECK ("application_status_events"."from_status" is null or "application_status_events"."from_status" in ('saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn', 'hired'));--> statement-breakpoint
ALTER TABLE "application_status_events" ADD CONSTRAINT "application_status_events_to_check" CHECK ("application_status_events"."to_status" in ('saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn', 'hired'));--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_status_check" CHECK ("applications"."status" in ('saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn', 'hired'));
