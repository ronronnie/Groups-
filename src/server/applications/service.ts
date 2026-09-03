import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import {
  applicationDetailsInputSchema,
  applicationStatusInputSchema,
  applicationTrackerFilterSchema,
  type ApplicationStatus,
  type ApplicationTrackerFilter,
} from "@/domains/applications/tracker";

export type ApplicationSqlExecutor = <Row extends Record<string, unknown>>(
  query: SQL,
) => Promise<{ rows: Row[] }>;

export type ApplicationTimelineEvent = {
  id: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  createdAt: Date;
};

export type ApplicationTrackerItem = {
  id: string;
  jobId: string;
  company: string;
  title: string;
  location: string;
  canonicalUrl: string;
  status: ApplicationStatus;
  privateNotes: string;
  nextAction: string;
  nextActionDate: string | null;
  appliedAt: Date | null;
  updatedAt: Date;
  timeline: ApplicationTimelineEvent[];
};

type TrackerRow = Omit<
  ApplicationTrackerItem,
  "appliedAt" | "updatedAt" | "timeline"
> & {
  appliedAt: Date | string | null;
  updatedAt: Date | string;
  timeline: Array<{
    id: string;
    fromStatus: ApplicationStatus | null;
    toStatus: ApplicationStatus;
    createdAt: Date | string;
  }>;
};

const trackerIdentitySchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
});

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function mapTrackerRow(row: TrackerRow): ApplicationTrackerItem {
  return {
    ...row,
    appliedAt: row.appliedAt ? toDate(row.appliedAt) : null,
    updatedAt: toDate(row.updatedAt),
    timeline: row.timeline.map((event) => ({
      ...event,
      createdAt: toDate(event.createdAt),
    })),
  };
}

async function isActiveGroupMember(
  execute: ApplicationSqlExecutor,
  input: { groupId: string; userId: string },
) {
  const result = await execute<{ allowed: boolean }>(sql`
    select true as allowed
    from group_memberships
    where group_id = ${input.groupId}
      and user_id = ${input.userId}
      and status = 'active'
    limit 1
  `);

  return Boolean(result.rows[0]?.allowed);
}

export async function listApplicationTracker(
  execute: ApplicationSqlExecutor,
  input: {
    groupId: string;
    userId: string;
    filter: ApplicationTrackerFilter;
  },
) {
  const identity = trackerIdentitySchema.parse(input);
  const filter = applicationTrackerFilterSchema.parse(input.filter);

  if (!(await isActiveGroupMember(execute, identity))) return null;

  const result = await execute<TrackerRow>(sql`
    select
      application.id,
      job.id as "jobId",
      job.company,
      job.title,
      job.location,
      job.canonical_url as "canonicalUrl",
      application.status,
      coalesce(application.private_notes, '') as "privateNotes",
      coalesce(application.next_action, '') as "nextAction",
      application.next_action_date as "nextActionDate",
      application.applied_at as "appliedAt",
      application.updated_at as "updatedAt",
      coalesce(history.events, '[]'::json) as timeline
    from applications application
    inner join jobs job on job.id = application.job_id
    left join lateral (
      select json_agg(
        json_build_object(
          'id', event.id,
          'fromStatus', event.from_status,
          'toStatus', event.to_status,
          'createdAt', event.created_at
        ) order by event.created_at desc, event.id desc
      ) as events
      from application_status_events event
      where event.application_id = application.id
    ) history on true
    where application.user_id = ${identity.userId}
      and application.source_group_id = ${identity.groupId}
      and application.archived_at is null
      and (${filter} = 'all' or application.status = ${filter})
      and exists (
        select 1
        from job_shares share
        where share.group_id = ${identity.groupId}
          and share.job_id = application.job_id
      )
    order by
      application.next_action_date asc nulls last,
      application.updated_at desc,
      application.id desc
  `);

  return result.rows.map(mapTrackerRow);
}

export async function updateApplicationStatus(
  execute: ApplicationSqlExecutor,
  input: {
    applicationId: string;
    groupId: string;
    userId: string;
    status: ApplicationStatus;
  },
) {
  const values = applicationStatusInputSchema
    .extend({ userId: z.string().uuid() })
    .parse(input);
  const result = await execute<{
    applicationId: string;
    jobId: string;
    previousStatus: ApplicationStatus;
  }>(sql`
    with current_application as materialized (
      select application.id, application.job_id, application.status
      from applications application
      where application.id = ${values.applicationId}
        and application.user_id = ${values.userId}
        and application.source_group_id = ${values.groupId}
        and exists (
          select 1
          from group_memberships membership
          where membership.group_id = ${values.groupId}
            and membership.user_id = ${values.userId}
            and membership.status = 'active'
        )
      for update
    ),
    updated_application as (
      update applications application
      set
        status = ${values.status},
        applied_at = case
          when ${values.status} <> 'saved'
            then coalesce(application.applied_at, now())
          else application.applied_at
        end,
        archived_at = null,
        updated_at = now()
      from current_application current
      where application.id = current.id
      returning application.id
    ),
    recorded_event as (
      insert into application_status_events (
        application_id,
        from_status,
        to_status,
        changed_by_user_id
      )
      select
        current.id,
        current.status,
        ${values.status},
        ${values.userId}
      from current_application current
      inner join updated_application updated on updated.id = current.id
      where current.status <> ${values.status}
      returning application_id
    )
    select
      current.id as "applicationId",
      current.job_id as "jobId",
      current.status as "previousStatus"
    from current_application current
    inner join updated_application updated on updated.id = current.id
  `);
  const application = result.rows[0];

  return application
    ? {
        applicationId: application.applicationId,
        jobId: application.jobId,
        changed: application.previousStatus !== values.status,
      }
    : null;
}

export async function updateApplicationDetails(
  execute: ApplicationSqlExecutor,
  input: {
    applicationId: string;
    groupId: string;
    userId: string;
    privateNotes: string;
    nextAction: string;
    nextActionDate: string;
  },
) {
  const values = applicationDetailsInputSchema
    .extend({ userId: z.string().uuid() })
    .parse(input);
  const result = await execute<{ applicationId: string }>(sql`
    update applications application
    set
      private_notes = ${values.privateNotes || null},
      next_action = ${values.nextAction || null},
      next_action_date = ${values.nextActionDate || null},
      updated_at = now()
    where application.id = ${values.applicationId}
      and application.user_id = ${values.userId}
      and application.source_group_id = ${values.groupId}
      and exists (
        select 1
        from group_memberships membership
        where membership.group_id = ${values.groupId}
          and membership.user_id = ${values.userId}
          and membership.status = 'active'
      )
    returning application.id as "applicationId"
  `);

  return result.rows[0] ?? null;
}
