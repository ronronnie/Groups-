import { sql } from "drizzle-orm";
import { z } from "zod";
import { explainJobMatch } from "@/domains/jobs/job-explanation";
import {
  rankJobMatch,
  type MatchCandidate,
  type MatchProfile,
} from "@/domains/jobs/job-ranking";
import type {
  EmploymentType,
  JobStatus,
  WorkMode,
} from "@/server/db/schema/jobs";
import type {
  GroupJob,
  JobShareAttribution,
  JobSqlExecutor,
} from "@/server/jobs/service";

export const feedFilterSchema = z.enum([
  "recommended",
  "saved",
  "applied",
  "dismissed",
]);
export type FeedFilter = z.infer<typeof feedFilterSchema>;

export type ForYouFeedItem = GroupJob & {
  matchScore: number;
  matchStrength: "strong" | "good" | "possible";
  explanation: string;
  saved: boolean;
  dismissed: boolean;
  applicationStatus: string | null;
  referralMemberCount: number;
  latestSharedAt: Date;
};

type ProfileRow = {
  skills: string[] | null;
  yearsExperience: number | null;
  desiredRoles: string[] | null;
  preferredLocations: string[] | null;
  remotePreference: MatchProfile["remotePreference"] | null;
  completeness: number | null;
};

type FeedRow = {
  id: string;
  canonicalUrl: string;
  company: string;
  title: string;
  descriptionSummary: string;
  location: string;
  workMode: WorkMode;
  employmentType: EmploymentType;
  experienceMin: number | null;
  experienceMax: number | null;
  skills: string[];
  salaryText: string | null;
  postedAt: Date | string | null;
  source: string;
  status: JobStatus;
  shareId: string;
  sharerId: string;
  sharerName: string;
  note: string | null;
  sharedAt: Date | string;
  saved: boolean;
  dismissed: boolean;
  applicationStatus: string | null;
  referralMemberCount: number;
};

const idSchema = z.string().uuid();

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function toOptionalDate(value: Date | string | null) {
  return value ? toDate(value) : null;
}

function isApplied(status: string | null) {
  return status !== null && status !== "not_applied";
}

function matchesFilter(item: ForYouFeedItem, filter: FeedFilter) {
  if (filter === "saved") return item.saved && !item.dismissed;
  if (filter === "applied") return isApplied(item.applicationStatus);
  if (filter === "dismissed") return item.dismissed;
  return !item.dismissed;
}

function groupFeedRows(rows: FeedRow[]) {
  const grouped = new Map<
    string,
    Omit<ForYouFeedItem, "matchScore" | "matchStrength" | "explanation">
  >();

  for (const row of rows) {
    const attribution: JobShareAttribution = {
      id: row.shareId,
      sharerId: row.sharerId,
      sharerName: row.sharerName,
      note: row.note,
      sharedAt: toDate(row.sharedAt),
    };
    const existing = grouped.get(row.id);

    if (existing) {
      existing.shares.push(attribution);
      if (attribution.sharedAt > existing.latestSharedAt) {
        existing.latestSharedAt = attribution.sharedAt;
      }
      continue;
    }

    grouped.set(row.id, {
      id: row.id,
      canonicalUrl: row.canonicalUrl,
      company: row.company,
      title: row.title,
      descriptionSummary: row.descriptionSummary,
      location: row.location,
      workMode: row.workMode,
      employmentType: row.employmentType,
      experienceMin: row.experienceMin,
      experienceMax: row.experienceMax,
      skills: row.skills,
      salaryText: row.salaryText,
      postedAt: toOptionalDate(row.postedAt),
      source: row.source,
      status: row.status,
      shares: [attribution],
      saved: row.saved,
      dismissed: row.dismissed,
      applicationStatus: row.applicationStatus,
      referralMemberCount: Number(row.referralMemberCount),
      latestSharedAt: attribution.sharedAt,
    });
  }

  return [...grouped.values()];
}

export async function getForYouFeed(
  execute: JobSqlExecutor,
  input: {
    groupId: string;
    viewerId: string;
    filter: FeedFilter;
    now?: Date;
  },
) {
  const groupId = idSchema.parse(input.groupId);
  const viewerId = idSchema.parse(input.viewerId);
  const filter = feedFilterSchema.parse(input.filter);
  const profileResult = await execute<ProfileRow>(sql`
    select
      coalesce(p.skills, '[]'::jsonb) as skills,
      coalesce(p.years_experience, 0) as "yearsExperience",
      coalesce(pp.desired_roles, '[]'::jsonb) as "desiredRoles",
      coalesce(pp.preferred_locations, '[]'::jsonb) as "preferredLocations",
      coalesce(pp.remote_preference, 'flexible') as "remotePreference",
      coalesce(p.profile_completeness, 0) as completeness
    from group_memberships membership
    left join profiles p on p.user_id = membership.user_id
    left join profile_preferences pp on pp.user_id = membership.user_id
    where membership.group_id = ${groupId}
      and membership.user_id = ${viewerId}
      and membership.status = 'active'
    limit 1
  `);
  const profileRow = profileResult.rows[0];
  if (!profileRow) return null;

  const profile: MatchProfile = {
    skills: profileRow.skills ?? [],
    yearsExperience: profileRow.yearsExperience ?? 0,
    desiredRoles: profileRow.desiredRoles ?? [],
    preferredLocations: profileRow.preferredLocations ?? [],
    remotePreference: profileRow.remotePreference ?? "flexible",
  };
  const result = await execute<FeedRow>(sql`
    select
      j.id,
      j.canonical_url as "canonicalUrl",
      j.company,
      j.title,
      j.description_summary as "descriptionSummary",
      j.location,
      j.work_mode as "workMode",
      j.employment_type as "employmentType",
      j.experience_min as "experienceMin",
      j.experience_max as "experienceMax",
      j.skills,
      j.salary_text as "salaryText",
      j.posted_at as "postedAt",
      j.source,
      j.status,
      js.id as "shareId",
      js.sharer_id as "sharerId",
      sharer.name as "sharerName",
      js.note,
      js.shared_at as "sharedAt",
      coalesce(viewer_state.saved, false) as saved,
      coalesce(viewer_state.dismissed, false) as dismissed,
      viewer_application.status as "applicationStatus",
      (
        select count(distinct referrer_membership.user_id)::int
        from group_memberships referrer_membership
        inner join profiles referrer_profile
          on referrer_profile.user_id = referrer_membership.user_id
        where referrer_membership.group_id = js.group_id
          and referrer_membership.status = 'active'
          and referrer_membership.user_id <> ${viewerId}
          and lower(referrer_profile.current_company) = lower(j.company)
          and referrer_profile.visibility in ('groups', 'public')
          and coalesce(
            (referrer_profile.privacy_settings ->> 'showCurrentCompany')::boolean,
            false
          )
      ) as "referralMemberCount"
    from job_shares js
    inner join jobs j on j.id = js.job_id
    inner join users sharer on sharer.id = js.sharer_id
    left join user_job_states viewer_state
      on viewer_state.job_id = j.id
      and viewer_state.user_id = ${viewerId}
    left join applications viewer_application
      on viewer_application.job_id = j.id
      and viewer_application.user_id = ${viewerId}
    where js.group_id = ${groupId}
      and j.status = 'active'
      and exists (
        select 1
        from group_memberships viewer_membership
        where viewer_membership.group_id = js.group_id
          and viewer_membership.user_id = ${viewerId}
          and viewer_membership.status = 'active'
      )
    order by js.shared_at desc, js.id desc
  `);
  const now = input.now ?? new Date();
  const items = groupFeedRows(result.rows)
    .map((job): ForYouFeedItem => {
      const candidate: MatchCandidate = {
        title: job.title,
        skills: job.skills,
        experienceMin: job.experienceMin,
        experienceMax: job.experienceMax,
        location: job.location,
        workMode: job.workMode,
        sharedAt: job.latestSharedAt,
        saved: job.saved,
        dismissed: job.dismissed,
        applicationStatus: job.applicationStatus,
      };
      const match = rankJobMatch(profile, candidate, now);

      return {
        ...job,
        matchScore: match.score,
        matchStrength: match.strength,
        explanation: explainJobMatch(profile, candidate, match),
      };
    })
    .filter((item) => matchesFilter(item, filter))
    .sort(
      (left, right) =>
        right.matchScore - left.matchScore ||
        right.latestSharedAt.getTime() - left.latestSharedAt.getTime(),
    );

  return {
    items,
    profileCompleteness: profileRow.completeness ?? 0,
  };
}

async function updateViewerJobState(
  execute: JobSqlExecutor,
  input: {
    groupId: string;
    userId: string;
    jobId: string;
    field: "saved" | "dismissed";
    value: boolean;
  },
) {
  const ids = z
    .object({
      groupId: idSchema,
      userId: idSchema,
      jobId: idSchema,
    })
    .parse(input);
  const result = await execute<{ jobId: string }>(sql`
    with authorized_job as materialized (
      select js.job_id
      from job_shares js
      inner join group_memberships membership
        on membership.group_id = js.group_id
        and membership.user_id = ${ids.userId}
        and membership.status = 'active'
      where js.group_id = ${ids.groupId}
        and js.job_id = ${ids.jobId}
      limit 1
    )
    insert into user_job_states (
      user_id,
      job_id,
      saved,
      dismissed,
      saved_at,
      dismissed_at
    )
    select
      ${ids.userId},
      authorized_job.job_id,
      ${input.field === "saved" ? input.value : false},
      ${input.field === "dismissed" ? input.value : false},
      ${input.field === "saved" && input.value ? sql`now()` : null},
      ${input.field === "dismissed" && input.value ? sql`now()` : null}
    from authorized_job
    on conflict (user_id, job_id) do update
    set
      saved = case
        when ${input.field} = 'saved' then ${input.value}
        when ${input.field} = 'dismissed' and ${input.value} then false
        else user_job_states.saved
      end,
      dismissed = case
        when ${input.field} = 'dismissed' then ${input.value}
        when ${input.field} = 'saved' and ${input.value} then false
        else user_job_states.dismissed
      end,
      saved_at = case
        when ${input.field} = 'saved' and ${input.value} then now()
        when ${input.field} = 'saved' and not ${input.value} then null
        when ${input.field} = 'dismissed' and ${input.value} then null
        else user_job_states.saved_at
      end,
      dismissed_at = case
        when ${input.field} = 'dismissed' and ${input.value} then now()
        when ${input.field} = 'dismissed' and not ${input.value} then null
        when ${input.field} = 'saved' and ${input.value} then null
        else user_job_states.dismissed_at
      end,
      updated_at = now()
    returning job_id as "jobId"
  `);

  return Boolean(result.rows[0]);
}

export function setJobSaved(
  execute: JobSqlExecutor,
  input: { groupId: string; userId: string; jobId: string; saved: boolean },
) {
  return updateViewerJobState(execute, {
    ...input,
    field: "saved",
    value: input.saved,
  });
}

export function setJobDismissed(
  execute: JobSqlExecutor,
  input: { groupId: string; userId: string; jobId: string; dismissed: boolean },
) {
  return updateViewerJobState(execute, {
    ...input,
    field: "dismissed",
    value: input.dismissed,
  });
}

export async function markJobApplied(
  execute: JobSqlExecutor,
  input: { groupId: string; userId: string; jobId: string },
) {
  const ids = z
    .object({
      groupId: idSchema,
      userId: idSchema,
      jobId: idSchema,
    })
    .parse(input);
  const result = await execute<{ applicationId: string }>(sql`
    with authorized_job as materialized (
      select js.job_id
      from job_shares js
      inner join group_memberships membership
        on membership.group_id = js.group_id
        and membership.user_id = ${ids.userId}
        and membership.status = 'active'
      where js.group_id = ${ids.groupId}
        and js.job_id = ${ids.jobId}
      limit 1
    ),
    previous_application as materialized (
      select id, status
      from applications
      where user_id = ${ids.userId}
        and job_id = ${ids.jobId}
      limit 1
    ),
    saved_application as (
      insert into applications (
        user_id,
        job_id,
        source_group_id,
        status,
        visibility,
        applied_at
      )
      select
        ${ids.userId},
        authorized_job.job_id,
        ${ids.groupId},
        'applied',
        'private',
        now()
      from authorized_job
      on conflict (user_id, job_id) do update
      set
        status = case
          when applications.status = 'not_applied' then 'applied'
          else applications.status
        end,
        applied_at = coalesce(applications.applied_at, now()),
        source_group_id = coalesce(applications.source_group_id, excluded.source_group_id),
        updated_at = now()
      returning id, status
    ),
    recorded_event as (
      insert into application_status_events (
        application_id,
        from_status,
        to_status,
        changed_by_user_id
      )
      select
        saved_application.id,
        previous_application.status,
        'applied',
        ${ids.userId}
      from saved_application
      left join previous_application on previous_application.id = saved_application.id
      where saved_application.status = 'applied'
        and coalesce(previous_application.status, 'not_applied') = 'not_applied'
      returning application_id
    )
    select saved_application.id as "applicationId"
    from saved_application
  `);

  return Boolean(result.rows[0]);
}
