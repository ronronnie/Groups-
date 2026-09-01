CREATE TABLE "application_status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"changed_by_user_id" uuid NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_status_events_from_check" CHECK ("application_status_events"."from_status" is null or "application_status_events"."from_status" in ('not_applied', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn', 'hired')),
	CONSTRAINT "application_status_events_to_check" CHECK ("application_status_events"."to_status" in ('not_applied', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn', 'hired'))
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"source_group_id" uuid,
	"status" text DEFAULT 'not_applied' NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"applied_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_status_check" CHECK ("applications"."status" in ('not_applied', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn', 'hired')),
	CONSTRAINT "applications_visibility_check" CHECK ("applications"."visibility" in ('private', 'referrers', 'group'))
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"job_id" uuid,
	"kind" text NOT NULL,
	"title" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_threads_context_check" CHECK (("message_threads"."kind" = 'general' and "message_threads"."job_id" is null) or ("message_threads"."kind" = 'job' and "message_threads"."job_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_id" uuid,
	"reply_to_id" uuid,
	"body" text NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_body_check" CHECK (length(trim("messages"."body")) > 0)
);
--> statement-breakpoint
CREATE TABLE "group_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"inviter_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"max_uses" integer,
	"use_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_invites_max_uses_check" CHECK ("group_invites"."max_uses" is null or "group_invites"."max_uses" > 0),
	CONSTRAINT "group_invites_use_count_check" CHECK ("group_invites"."use_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "group_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_memberships_role_check" CHECK ("group_memberships"."role" in ('owner', 'admin', 'member')),
	CONSTRAINT "group_memberships_status_check" CHECK ("group_memberships"."status" in ('active', 'left', 'removed'))
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"engine_key" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "groups_engine_key_check" CHECK ("groups"."engine_key" = 'jobs')
);
--> statement-breakpoint
CREATE TABLE "job_embeddings" (
	"job_id" uuid PRIMARY KEY NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"model_alias" text NOT NULL,
	"content_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"sharer_id" uuid NOT NULL,
	"note" text,
	"shared_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_url" text NOT NULL,
	"company" text NOT NULL,
	"title" text NOT NULL,
	"description_summary" text DEFAULT '' NOT NULL,
	"description_text" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"work_mode" text DEFAULT 'unspecified' NOT NULL,
	"employment_type" text DEFAULT 'unspecified' NOT NULL,
	"experience_min" integer,
	"experience_max" integer,
	"skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"salary_text" text,
	"posted_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"source" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_work_mode_check" CHECK ("jobs"."work_mode" in ('remote', 'hybrid', 'onsite', 'unspecified')),
	CONSTRAINT "jobs_employment_type_check" CHECK ("jobs"."employment_type" in ('full_time', 'part_time', 'contract', 'internship', 'temporary', 'unspecified')),
	CONSTRAINT "jobs_status_check" CHECK ("jobs"."status" in ('active', 'expired', 'closed', 'draft')),
	CONSTRAINT "jobs_experience_range_check" CHECK (("jobs"."experience_min" is null or "jobs"."experience_min" >= 0) and ("jobs"."experience_max" is null or "jobs"."experience_max" >= "jobs"."experience_min"))
);
--> statement-breakpoint
CREATE TABLE "user_job_states" (
	"user_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"seen" boolean DEFAULT false NOT NULL,
	"saved" boolean DEFAULT false NOT NULL,
	"dismissed" boolean DEFAULT false NOT NULL,
	"seen_at" timestamp with time zone,
	"saved_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_job_states_user_id_job_id_pk" PRIMARY KEY("user_id","job_id")
);
--> statement-breakpoint
CREATE TABLE "outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"subject_user_id" uuid NOT NULL,
	"shared_by_user_id" uuid,
	"referred_by_user_id" uuid,
	"outcome_type" text NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"consent_granted_at" timestamp with time zone,
	"shared_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outcomes_type_check" CHECK ("outcomes"."outcome_type" in ('interview', 'offer', 'hired')),
	CONSTRAINT "outcomes_visibility_check" CHECK ("outcomes"."visibility" in ('private', 'group')),
	CONSTRAINT "outcomes_consent_check" CHECK (("outcomes"."visibility" = 'private' and "outcomes"."shared_at" is null) or ("outcomes"."visibility" = 'group' and "outcomes"."consent_granted_at" is not null and "outcomes"."shared_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "profile_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"desired_roles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preferred_locations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"remote_preference" text DEFAULT 'flexible' NOT NULL,
	"minimum_salary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_preferences_remote_check" CHECK ("profile_preferences"."remote_preference" in ('remote', 'hybrid', 'onsite', 'flexible'))
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"headline" text DEFAULT '' NOT NULL,
	"current_role" text DEFAULT '' NOT NULL,
	"current_company" text,
	"years_experience" integer DEFAULT 0 NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"profile_completeness" integer DEFAULT 0 NOT NULL,
	"visibility" text DEFAULT 'groups' NOT NULL,
	"privacy_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_years_experience_check" CHECK ("profiles"."years_experience" between 0 and 80),
	CONSTRAINT "profiles_completeness_check" CHECK ("profiles"."profile_completeness" between 0 and 100),
	CONSTRAINT "profiles_visibility_check" CHECK ("profiles"."visibility" in ('private', 'groups', 'public'))
);
--> statement-breakpoint
CREATE TABLE "referral_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"potential_referrer_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"message" text NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"responded_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_requests_distinct_users_check" CHECK ("referral_requests"."requester_id" <> "referral_requests"."potential_referrer_id"),
	CONSTRAINT "referral_requests_state_check" CHECK ("referral_requests"."state" in ('pending', 'accepted', 'declined', 'withdrawn', 'completed'))
);
--> statement-breakpoint
CREATE TABLE "reputation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"recipient_user_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"event_type" text NOT NULL,
	"source_entity_type" text NOT NULL,
	"source_entity_id" uuid NOT NULL,
	"points" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reputation_events_type_check" CHECK ("reputation_events"."event_type" in ('job_shared', 'job_saved_by_member', 'application_attributed', 'referral_completed', 'interview_helped', 'hire_helped')),
	CONSTRAINT "reputation_events_points_check" CHECK ("reputation_events"."points" between -100 and 100)
);
--> statement-breakpoint
CREATE TABLE "user_reputation_summaries" (
	"group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"jobs_shared" integer DEFAULT 0 NOT NULL,
	"referrals_completed" integer DEFAULT 0 NOT NULL,
	"hires_helped" integer DEFAULT 0 NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_reputation_summaries_group_id_user_id_pk" PRIMARY KEY("group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"event_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"visibility" text DEFAULT 'group' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_events_visibility_check" CHECK ("activity_events"."visibility" in ('private', 'group', 'admin'))
);
--> statement-breakpoint
CREATE TABLE "ai_usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"group_id" uuid,
	"feature" text NOT NULL,
	"model_alias" text NOT NULL,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"estimated_cost_usd" numeric(12, 6),
	"request_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_usage_events_token_counts_check" CHECK (("ai_usage_events"."prompt_tokens" is null or "ai_usage_events"."prompt_tokens" >= 0) and ("ai_usage_events"."completion_tokens" is null or "ai_usage_events"."completion_tokens" >= 0))
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"group_id" uuid,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "message_threads_id_group_unique" ON "message_threads" USING btree ("id","group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "messages_id_thread_group_unique" ON "messages" USING btree ("id","thread_id","group_id");--> statement-breakpoint
ALTER TABLE "application_status_events" ADD CONSTRAINT "application_status_events_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_status_events" ADD CONSTRAINT "application_status_events_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_source_group_id_groups_id_fk" FOREIGN KEY ("source_group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_group_fk" FOREIGN KEY ("thread_id","group_id") REFERENCES "public"."message_threads"("id","group_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_reply_context_fk" FOREIGN KEY ("reply_to_id","thread_id","group_id") REFERENCES "public"."messages"("id","thread_id","group_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invites" ADD CONSTRAINT "group_invites_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invites" ADD CONSTRAINT "group_invites_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_embeddings" ADD CONSTRAINT "job_embeddings_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_shares" ADD CONSTRAINT "job_shares_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_shares" ADD CONSTRAINT "job_shares_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_shares" ADD CONSTRAINT "job_shares_sharer_id_users_id_fk" FOREIGN KEY ("sharer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_job_states" ADD CONSTRAINT "user_job_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_job_states" ADD CONSTRAINT "user_job_states_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcomes" ADD CONSTRAINT "outcomes_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcomes" ADD CONSTRAINT "outcomes_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcomes" ADD CONSTRAINT "outcomes_subject_user_id_users_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcomes" ADD CONSTRAINT "outcomes_shared_by_user_id_users_id_fk" FOREIGN KEY ("shared_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcomes" ADD CONSTRAINT "outcomes_referred_by_user_id_users_id_fk" FOREIGN KEY ("referred_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_preferences" ADD CONSTRAINT "profile_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_requests" ADD CONSTRAINT "referral_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_requests" ADD CONSTRAINT "referral_requests_potential_referrer_id_users_id_fk" FOREIGN KEY ("potential_referrer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_requests" ADD CONSTRAINT "referral_requests_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_requests" ADD CONSTRAINT "referral_requests_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reputation_events" ADD CONSTRAINT "reputation_events_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reputation_events" ADD CONSTRAINT "reputation_events_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reputation_events" ADD CONSTRAINT "reputation_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_reputation_summaries" ADD CONSTRAINT "user_reputation_summaries_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_reputation_summaries" ADD CONSTRAINT "user_reputation_summaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_status_events_application_created_idx" ON "application_status_events" USING btree ("application_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "applications_user_job_unique" ON "applications" USING btree ("user_id","job_id");--> statement-breakpoint
CREATE INDEX "applications_user_status_idx" ON "applications" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "applications_source_group_id_idx" ON "applications" USING btree ("source_group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_account_unique" ON "accounts" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_unique" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "verifications_expires_at_idx" ON "verifications" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "message_threads_general_group_unique" ON "message_threads" USING btree ("group_id") WHERE "message_threads"."kind" = 'general';--> statement-breakpoint
CREATE UNIQUE INDEX "message_threads_job_group_unique" ON "message_threads" USING btree ("group_id","job_id") WHERE "message_threads"."kind" = 'job';--> statement-breakpoint
CREATE INDEX "message_threads_group_updated_idx" ON "message_threads" USING btree ("group_id","updated_at");--> statement-breakpoint
CREATE INDEX "messages_thread_created_idx" ON "messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_group_created_idx" ON "messages" USING btree ("group_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "group_invites_token_hash_unique" ON "group_invites" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "group_invites_group_id_idx" ON "group_invites" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "group_invites_expires_at_idx" ON "group_invites" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "group_memberships_group_user_unique" ON "group_memberships" USING btree ("group_id","user_id");--> statement-breakpoint
CREATE INDEX "group_memberships_user_id_idx" ON "group_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "group_memberships_group_status_idx" ON "group_memberships" USING btree ("group_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "groups_slug_unique" ON "groups" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "groups_owner_id_idx" ON "groups" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "job_embeddings_embedding_hnsw_idx" ON "job_embeddings" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "job_embeddings_model_alias_idx" ON "job_embeddings" USING btree ("model_alias");--> statement-breakpoint
CREATE UNIQUE INDEX "job_shares_group_job_sharer_unique" ON "job_shares" USING btree ("group_id","job_id","sharer_id");--> statement-breakpoint
CREATE INDEX "job_shares_group_shared_at_idx" ON "job_shares" USING btree ("group_id","shared_at");--> statement-breakpoint
CREATE INDEX "job_shares_job_id_idx" ON "job_shares" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "job_shares_sharer_id_idx" ON "job_shares" USING btree ("sharer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_canonical_url_unique" ON "jobs" USING btree ("canonical_url");--> statement-breakpoint
CREATE INDEX "jobs_company_title_idx" ON "jobs" USING btree ("company","title");--> statement-breakpoint
CREATE INDEX "jobs_status_posted_at_idx" ON "jobs" USING btree ("status","posted_at");--> statement-breakpoint
CREATE INDEX "user_job_states_user_saved_idx" ON "user_job_states" USING btree ("user_id","saved");--> statement-breakpoint
CREATE INDEX "outcomes_group_created_idx" ON "outcomes" USING btree ("group_id","created_at");--> statement-breakpoint
CREATE INDEX "outcomes_subject_user_idx" ON "outcomes" USING btree ("subject_user_id");--> statement-breakpoint
CREATE INDEX "profiles_location_idx" ON "profiles" USING btree ("location");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_requests_active_unique" ON "referral_requests" USING btree ("requester_id","potential_referrer_id","job_id","group_id") WHERE "referral_requests"."state" in ('pending', 'accepted');--> statement-breakpoint
CREATE INDEX "referral_requests_requester_state_idx" ON "referral_requests" USING btree ("requester_id","state");--> statement-breakpoint
CREATE INDEX "referral_requests_referrer_state_idx" ON "referral_requests" USING btree ("potential_referrer_id","state");--> statement-breakpoint
CREATE INDEX "referral_requests_group_id_idx" ON "referral_requests" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "reputation_events_group_recipient_created_idx" ON "reputation_events" USING btree ("group_id","recipient_user_id","created_at");--> statement-breakpoint
CREATE INDEX "reputation_events_source_idx" ON "reputation_events" USING btree ("source_entity_type","source_entity_id");--> statement-breakpoint
CREATE INDEX "user_reputation_summaries_group_points_idx" ON "user_reputation_summaries" USING btree ("group_id","total_points");--> statement-breakpoint
CREATE INDEX "activity_events_group_created_idx" ON "activity_events" USING btree ("group_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_events_group_feature_created_idx" ON "ai_usage_events" USING btree ("group_id","feature","created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_events_user_created_idx" ON "ai_usage_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_read_created_idx" ON "notifications" USING btree ("user_id","read_at","created_at");
