CREATE TABLE "referral_request_state_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"from_state" text,
	"to_state" text NOT NULL,
	"changed_by_user_id" uuid NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_request_events_from_check" CHECK ("referral_request_state_events"."from_state" is null or "referral_request_state_events"."from_state" in ('requested', 'accepted', 'declined', 'needs_info', 'referred', 'closed')),
	CONSTRAINT "referral_request_events_to_check" CHECK ("referral_request_state_events"."to_state" in ('requested', 'accepted', 'declined', 'needs_info', 'referred', 'closed'))
);
--> statement-breakpoint
ALTER TABLE "referral_requests" DROP CONSTRAINT "referral_requests_state_check";--> statement-breakpoint
DROP INDEX "referral_requests_active_unique";--> statement-breakpoint
UPDATE "referral_requests"
SET "state" = case
	when "state" = 'pending' then 'requested'
	when "state" = 'withdrawn' then 'closed'
	when "state" = 'completed' then 'referred'
	else "state"
end;--> statement-breakpoint
ALTER TABLE "referral_requests" ALTER COLUMN "state" SET DEFAULT 'requested';--> statement-breakpoint
ALTER TABLE "referral_request_state_events" ADD CONSTRAINT "referral_request_state_events_request_id_referral_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."referral_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_request_state_events" ADD CONSTRAINT "referral_request_state_events_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "referral_request_events_request_created_idx" ON "referral_request_state_events" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_requests_active_unique" ON "referral_requests" USING btree ("requester_id","potential_referrer_id","job_id","group_id") WHERE "referral_requests"."state" in ('requested', 'accepted', 'needs_info', 'referred');--> statement-breakpoint
ALTER TABLE "referral_requests" ADD CONSTRAINT "referral_requests_state_check" CHECK ("referral_requests"."state" in ('requested', 'accepted', 'declined', 'needs_info', 'referred', 'closed'));--> statement-breakpoint
INSERT INTO "referral_request_state_events" (
	"request_id",
	"from_state",
	"to_state",
	"changed_by_user_id",
	"created_at"
)
SELECT "id", null, 'requested', "requester_id", "created_at"
FROM "referral_requests";--> statement-breakpoint
INSERT INTO "referral_request_state_events" (
	"request_id",
	"from_state",
	"to_state",
	"changed_by_user_id",
	"created_at"
)
SELECT
	"id",
	'requested',
	"state",
	"potential_referrer_id",
	coalesce("responded_at", "updated_at")
FROM "referral_requests"
WHERE "state" <> 'requested';
