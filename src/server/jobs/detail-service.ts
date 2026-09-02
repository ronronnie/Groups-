import { sql } from "drizzle-orm";
import { z } from "zod";
import { explainJobMatch } from "@/domains/jobs/job-explanation";
import {
  rankJobMatch,
  type MatchCandidate,
  type MatchProfile,
} from "@/domains/jobs/job-ranking";
import { getGroupJob, type JobSqlExecutor } from "@/server/jobs/service";

type ViewerContextRow = {
  skills: string[] | null;
  yearsExperience: number | null;
  desiredRoles: string[] | null;
  preferredLocations: string[] | null;
  remotePreference: MatchProfile["remotePreference"] | null;
  saved: boolean;
  dismissed: boolean;
  applicationStatus: string | null;
  referralMemberCount: number;
};

const idSchema = z.string().uuid();

export async function getGroupJobDetail(
  execute: JobSqlExecutor,
  input: {
    groupId: string;
    jobId: string;
    viewerId: string;
    now?: Date;
  },
) {
  const ids = z
    .object({ groupId: idSchema, jobId: idSchema, viewerId: idSchema })
    .parse(input);
  const job = await getGroupJob(execute, ids);
  if (!job) return null;

  const contextResult = await execute<ViewerContextRow>(sql`
    select
      coalesce(profile.skills, '[]'::jsonb) as skills,
      coalesce(profile.years_experience, 0) as "yearsExperience",
      coalesce(preference.desired_roles, '[]'::jsonb) as "desiredRoles",
      coalesce(preference.preferred_locations, '[]'::jsonb) as "preferredLocations",
      coalesce(preference.remote_preference, 'flexible') as "remotePreference",
      coalesce(job_state.saved, false) as saved,
      coalesce(job_state.dismissed, false) as dismissed,
      application.status as "applicationStatus",
      (
        select count(distinct referrer_membership.user_id)::int
        from group_memberships referrer_membership
        inner join profiles referrer_profile
          on referrer_profile.user_id = referrer_membership.user_id
        where referrer_membership.group_id = membership.group_id
          and referrer_membership.status = 'active'
          and referrer_membership.user_id <> ${ids.viewerId}
          and lower(referrer_profile.current_company) = lower(${job.company})
          and referrer_profile.visibility in ('groups', 'public')
          and coalesce(
            (referrer_profile.privacy_settings ->> 'showCurrentCompany')::boolean,
            false
          )
      ) as "referralMemberCount"
    from group_memberships membership
    left join profiles profile on profile.user_id = membership.user_id
    left join profile_preferences preference
      on preference.user_id = membership.user_id
    left join user_job_states job_state
      on job_state.user_id = membership.user_id
      and job_state.job_id = ${ids.jobId}
    left join applications application
      on application.user_id = membership.user_id
      and application.job_id = ${ids.jobId}
    where membership.group_id = ${ids.groupId}
      and membership.user_id = ${ids.viewerId}
      and membership.status = 'active'
      and exists (
        select 1
        from job_shares shares
        where shares.group_id = membership.group_id
          and shares.job_id = ${ids.jobId}
      )
    limit 1
  `);
  const context = contextResult.rows[0];
  if (!context) return null;

  const profile: MatchProfile = {
    skills: context.skills ?? [],
    yearsExperience: context.yearsExperience ?? 0,
    desiredRoles: context.desiredRoles ?? [],
    preferredLocations: context.preferredLocations ?? [],
    remotePreference: context.remotePreference ?? "flexible",
  };
  const latestSharedAt = job.shares.reduce(
    (latest, share) => (share.sharedAt > latest ? share.sharedAt : latest),
    job.shares[0]!.sharedAt,
  );
  const candidate: MatchCandidate = {
    title: job.title,
    skills: job.skills,
    experienceMin: job.experienceMin,
    experienceMax: job.experienceMax,
    location: job.location,
    workMode: job.workMode,
    sharedAt: latestSharedAt,
    saved: context.saved,
    dismissed: context.dismissed,
    applicationStatus: context.applicationStatus,
  };
  const match = rankJobMatch(profile, candidate, input.now);

  return {
    job,
    matchScore: match.score,
    matchStrength: match.strength,
    matchExplanation: explainJobMatch(profile, candidate, match),
    saved: context.saved,
    dismissed: context.dismissed,
    applicationStatus: context.applicationStatus,
    referralMemberCount: Number(context.referralMemberCount),
  };
}

export type GroupJobDetail = NonNullable<
  Awaited<ReturnType<typeof getGroupJobDetail>>
>;
