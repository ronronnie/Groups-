import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import {
  canonicalizeJobUrl,
  extractFallbackJobDetails,
  shareJobInputSchema,
  type ShareJobInput,
} from "@/domains/jobs/job-sharing";
import {
  reviewedJobSchema,
  type ReviewedJob,
} from "@/domains/jobs/job-extraction";
import type {
  EmploymentType,
  JobStatus,
  WorkMode,
} from "@/server/db/schema/jobs";

export type JobSqlExecutor = <Row extends Record<string, unknown>>(
  query: SQL,
) => Promise<{ rows: Row[] }>;

export type JobShareAttribution = {
  id: string;
  sharerId: string;
  sharerName: string;
  note: string | null;
  sharedAt: Date;
};

export type GroupJob = {
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
  postedAt: Date | null;
  source: string;
  status: JobStatus;
  shares: JobShareAttribution[];
};

type GroupJobRow = Omit<GroupJob, "postedAt" | "shares"> & {
  postedAt: Date | string | null;
  shareId: string;
  sharerId: string;
  sharerName: string;
  note: string | null;
  sharedAt: Date | string;
};

const idSchema = z.string().uuid();

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function toOptionalDate(value: Date | string | null) {
  return value ? toDate(value) : null;
}

function groupRowsByJob(rows: GroupJobRow[]) {
  const grouped = new Map<string, GroupJob>();

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
    });
  }

  return [...grouped.values()];
}

const groupJobSelection = sql`
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
  js.shared_at as "sharedAt"
`;

export async function shareJob(
  execute: JobSqlExecutor,
  input: ShareJobInput & {
    groupId: string;
    sharerId: string;
    reviewedJob?: ReviewedJob;
  },
) {
  const groupId = idSchema.parse(input.groupId);
  const sharerId = idSchema.parse(input.sharerId);
  const values = shareJobInputSchema.parse(input);
  const canonicalUrl = canonicalizeJobUrl(values.url);
  const fallback = extractFallbackJobDetails(canonicalUrl, values);
  const reviewed = input.reviewedJob
    ? reviewedJobSchema.parse(input.reviewedJob)
    : null;
  const details = reviewed ?? {
    company: fallback.company,
    title: fallback.title,
    descriptionSummary: "",
    location: "",
    workMode: "unspecified" as const,
    employmentType: "unspecified" as const,
    experienceMin: null,
    experienceMax: null,
    skills: [],
    salaryText: null,
  };

  if (reviewed && canonicalizeJobUrl(reviewed.url) !== canonicalUrl) {
    throw new Error("Reviewed job URL does not match the shared URL.");
  }

  const result = await execute<{
    shareId: string;
    jobId: string;
    groupSlug: string;
    shareCreated: boolean;
  }>(sql`
    with authorized_membership as materialized (
      select gm.group_id
      from group_memberships gm
      where gm.group_id = ${groupId}
        and gm.user_id = ${sharerId}
        and gm.status = 'active'
      limit 1
    ),
    saved_job as (
      insert into jobs (
        canonical_url,
        company,
        title,
        description_summary,
        location,
        work_mode,
        employment_type,
        experience_min,
        experience_max,
        skills,
        salary_text,
        source,
        status
      )
      select
        ${canonicalUrl},
        ${details.company},
        ${details.title},
        ${details.descriptionSummary},
        ${details.location},
        ${details.workMode},
        ${details.employmentType},
        ${details.experienceMin},
        ${details.experienceMax},
        ${JSON.stringify(details.skills)}::jsonb,
        ${details.salaryText},
        ${fallback.source},
        'active'
      from authorized_membership
      on conflict (canonical_url) do update
      set
        company = case
          when jobs.company = 'Company not provided' then excluded.company
          else jobs.company
        end,
        title = case
          when jobs.title = 'Job opportunity' then excluded.title
          else jobs.title
        end,
        description_summary = case
          when jobs.description_summary = '' then excluded.description_summary
          else jobs.description_summary
        end,
        location = case
          when jobs.location = '' then excluded.location
          else jobs.location
        end,
        work_mode = case
          when jobs.work_mode = 'unspecified' then excluded.work_mode
          else jobs.work_mode
        end,
        employment_type = case
          when jobs.employment_type = 'unspecified' then excluded.employment_type
          else jobs.employment_type
        end,
        experience_min = coalesce(jobs.experience_min, excluded.experience_min),
        experience_max = coalesce(jobs.experience_max, excluded.experience_max),
        skills = case
          when jobs.skills = '[]'::jsonb then excluded.skills
          else jobs.skills
        end,
        salary_text = coalesce(jobs.salary_text, excluded.salary_text),
        updated_at = now()
      returning id
    ),
    existing_share as materialized (
      select js.id
      from job_shares js
      inner join saved_job sj on sj.id = js.job_id
      where js.group_id = ${groupId}
        and js.sharer_id = ${sharerId}
    ),
    saved_share as (
      insert into job_shares (group_id, job_id, sharer_id, note)
      select
        ${groupId},
        sj.id,
        ${sharerId},
        ${values.note}
      from saved_job sj
      on conflict (group_id, job_id, sharer_id) do update
      set note = excluded.note
      returning id, job_id
    )
    select
      ss.id as "shareId",
      ss.job_id as "jobId",
      g.slug as "groupSlug",
      not exists (select 1 from existing_share) as "shareCreated"
    from saved_share ss
    inner join groups g on g.id = ${groupId}
  `);

  return result.rows[0] ?? null;
}

export async function isActiveGroupMember(
  execute: JobSqlExecutor,
  input: { groupId: string; userId: string },
) {
  const groupId = idSchema.parse(input.groupId);
  const userId = idSchema.parse(input.userId);
  const result = await execute<{ allowed: boolean }>(sql`
    select true as allowed
    from group_memberships
    where group_id = ${groupId}
      and user_id = ${userId}
      and status = 'active'
    limit 1
  `);

  return Boolean(result.rows[0]?.allowed);
}

export async function listGroupJobs(
  execute: JobSqlExecutor,
  input: { groupId: string; viewerId: string },
): Promise<GroupJob[] | null> {
  const groupId = idSchema.parse(input.groupId);
  const viewerId = idSchema.parse(input.viewerId);
  const authorized = await execute<{ allowed: boolean }>(sql`
    select true as allowed
    from group_memberships
    where group_id = ${groupId}
      and user_id = ${viewerId}
      and status = 'active'
    limit 1
  `);

  if (!authorized.rows[0]) return null;

  const result = await execute<GroupJobRow>(sql`
    select ${groupJobSelection}
    from job_shares js
    inner join jobs j on j.id = js.job_id
    inner join users sharer on sharer.id = js.sharer_id
    where js.group_id = ${groupId}
      and exists (
        select 1
        from group_memberships viewer
        where viewer.group_id = js.group_id
          and viewer.user_id = ${viewerId}
          and viewer.status = 'active'
      )
    order by js.shared_at desc, js.id desc
  `);

  return groupRowsByJob(result.rows);
}

export async function getGroupJob(
  execute: JobSqlExecutor,
  input: { groupId: string; jobId: string; viewerId: string },
): Promise<GroupJob | null> {
  const ids = z
    .object({
      groupId: idSchema,
      jobId: idSchema,
      viewerId: idSchema,
    })
    .parse(input);
  const result = await execute<GroupJobRow>(sql`
    select ${groupJobSelection}
    from job_shares js
    inner join jobs j on j.id = js.job_id
    inner join users sharer on sharer.id = js.sharer_id
    inner join group_memberships viewer
      on viewer.group_id = js.group_id
      and viewer.user_id = ${ids.viewerId}
      and viewer.status = 'active'
    where js.group_id = ${ids.groupId}
      and js.job_id = ${ids.jobId}
    order by js.shared_at desc, js.id desc
  `);

  return groupRowsByJob(result.rows)[0] ?? null;
}
