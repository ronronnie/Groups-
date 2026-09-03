ALTER TABLE "user_reputation_summaries" ADD COLUMN "jobs_saved_by_members" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_reputation_summaries" ADD COLUMN "applications_attributed" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_reputation_summaries" ADD COLUMN "interviews_helped" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DELETE FROM "reputation_events" duplicate
USING "reputation_events" original
WHERE duplicate."id" > original."id"
  AND duplicate."group_id" = original."group_id"
  AND duplicate."recipient_user_id" = original."recipient_user_id"
  AND duplicate."event_type" = original."event_type"
  AND duplicate."source_entity_type" = original."source_entity_type"
  AND duplicate."source_entity_id" = original."source_entity_id";--> statement-breakpoint
CREATE UNIQUE INDEX "reputation_events_credit_unique" ON "reputation_events" USING btree ("group_id","recipient_user_id","event_type","source_entity_type","source_entity_id");--> statement-breakpoint
INSERT INTO "user_reputation_summaries" (
	"group_id",
	"user_id",
	"total_points",
	"jobs_shared",
	"jobs_saved_by_members",
	"applications_attributed",
	"referrals_completed",
	"interviews_helped",
	"hires_helped",
	"calculated_at"
)
SELECT
	membership."group_id",
	membership."user_id",
	coalesce(sum(event."points"), 0)::int,
	count(*) filter (where event."event_type" = 'job_shared')::int,
	count(*) filter (where event."event_type" = 'job_saved_by_member')::int,
	count(*) filter (where event."event_type" = 'application_attributed')::int,
	count(*) filter (where event."event_type" = 'referral_completed')::int,
	count(*) filter (where event."event_type" = 'interview_helped')::int,
	count(*) filter (where event."event_type" = 'hire_helped')::int,
	now()
FROM "group_memberships" membership
LEFT JOIN "reputation_events" event
	ON event."group_id" = membership."group_id"
	AND event."recipient_user_id" = membership."user_id"
WHERE membership."status" = 'active'
GROUP BY membership."group_id", membership."user_id"
ON CONFLICT ("group_id", "user_id") DO UPDATE SET
	"total_points" = excluded."total_points",
	"jobs_shared" = excluded."jobs_shared",
	"jobs_saved_by_members" = excluded."jobs_saved_by_members",
	"applications_attributed" = excluded."applications_attributed",
	"referrals_completed" = excluded."referrals_completed",
	"interviews_helped" = excluded."interviews_helped",
	"hires_helped" = excluded."hires_helped",
	"calculated_at" = excluded."calculated_at";
