import { sql } from "drizzle-orm";
import { z } from "zod";
import {
  digestCadenceSchema,
  type DigestCadence,
} from "@/domains/notifications/events";
import { getForYouFeed } from "@/server/jobs/feed-service";
import {
  getNotificationPreferences,
  type NotificationSqlExecutor,
} from "@/server/notifications/service";

type DigestJob = {
  id: string;
  title: string;
  company: string;
  href: string;
};

export type GroupDigest = {
  groupId: string;
  groupName: string;
  groupSlug: string;
  cadence: Exclude<DigestCadence, "off">;
  configuredCadence: DigestCadence;
  windowStart: Date;
  windowEnd: Date;
  jobsShared: number;
  strongMatches: Array<DigestJob & { matchScore: number }>;
  referralOpportunities: DigestJob[];
  savedJobsNeedingAction: DigestJob[];
  contributionHighlights: Array<{
    id: string;
    summary: string;
    createdAt: Date;
  }>;
};

const digestInputSchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
  cadence: digestCadenceSchema.exclude(["off"]),
});

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

export async function getRecipientGroupDigest(
  execute: NotificationSqlExecutor,
  input: {
    groupId: string;
    userId: string;
    cadence: "daily" | "weekly";
    now?: Date;
  },
): Promise<GroupDigest | null> {
  const values = digestInputSchema.parse(input);
  const windowEnd = input.now ?? new Date();
  const windowStart = new Date(
    windowEnd.getTime() -
      (values.cadence === "daily" ? 1 : 7) * 24 * 60 * 60 * 1_000,
  );
  const groupResult = await execute<{
    groupId: string;
    groupName: string;
    groupSlug: string;
  }>(sql`
    select
      group_record.id as "groupId",
      group_record.name as "groupName",
      group_record.slug as "groupSlug"
    from groups group_record
    inner join group_memberships membership
      on membership.group_id = group_record.id
      and membership.user_id = ${values.userId}
      and membership.status = 'active'
    where group_record.id = ${values.groupId}
    limit 1
  `);
  const group = groupResult.rows[0];
  if (!group) return null;

  const [preferences, sharedResult, referralResult, savedResult, highlights] =
    await Promise.all([
      getNotificationPreferences(execute, values.userId, values.groupId),
      execute<{ count: number }>(sql`
        select count(distinct share.id)::int as count
        from active_job_shares share
        where share.group_id = ${values.groupId}
          and share.shared_at >= ${windowStart}
          and share.shared_at <= ${windowEnd}
      `),
      execute<{ id: string; title: string; company: string }>(sql`
        select distinct job.id, job.title, job.company
        from referral_requests request
        inner join jobs job on job.id = request.job_id
        where request.group_id = ${values.groupId}
          and request.potential_referrer_id = ${values.userId}
          and request.state = 'requested'
        order by job.title
        limit 5
      `),
      execute<{ id: string; title: string; company: string }>(sql`
        select distinct job.id, job.title, job.company
        from user_job_states viewer_state
        inner join jobs job on job.id = viewer_state.job_id
        inner join active_job_shares share
          on share.job_id = job.id
          and share.group_id = ${values.groupId}
        left join applications application
          on application.user_id = viewer_state.user_id
          and application.job_id = viewer_state.job_id
          and application.archived_at is null
        where viewer_state.user_id = ${values.userId}
          and viewer_state.saved = true
          and viewer_state.dismissed = false
          and (
            application.id is null
            or application.status = 'saved'
            or application.next_action_date <= ${windowEnd}::date
          )
        order by job.title
        limit 5
      `),
      execute<{ id: string; summary: string; createdAt: Date | string }>(sql`
        select
          event.id,
          coalesce(event.metadata ->> 'summary', 'A member contributed.') as summary,
          event.created_at as "createdAt"
        from activity_events event
        where event.group_id = ${values.groupId}
          and event.visibility = 'group'
          and event.event_type in ('job_shared', 'outcome_shared', 'invite_accepted')
          and event.created_at >= ${windowStart}
          and event.created_at <= ${windowEnd}
        order by event.created_at desc, event.id desc
        limit 5
      `),
    ]);

  const feed = await getForYouFeed(execute, {
    groupId: values.groupId,
    viewerId: values.userId,
    filter: "recommended",
    now: windowEnd,
  });
  if (!feed) return null;

  const href = (jobId: string) =>
    `/app/groups/${group.groupSlug}/jobs/${jobId}`;
  const mapJob = (job: { id: string; title: string; company: string }) => ({
    ...job,
    href: href(job.id),
  });

  return {
    ...group,
    cadence: values.cadence,
    configuredCadence: preferences.digestCadence,
    windowStart,
    windowEnd,
    jobsShared: Number(sharedResult.rows[0]?.count ?? 0),
    strongMatches: feed.items
      .filter(
        (job) =>
          job.matchStrength === "strong" && job.latestSharedAt >= windowStart,
      )
      .slice(0, 5)
      .map((job) => ({ ...mapJob(job), matchScore: job.matchScore })),
    referralOpportunities: referralResult.rows.map(mapJob),
    savedJobsNeedingAction: savedResult.rows.map(mapJob),
    contributionHighlights: highlights.rows.map((event) => ({
      ...event,
      createdAt: toDate(event.createdAt),
    })),
  };
}
