import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import {
  reputationEventPolicy,
  reputationEventTypeSchema,
  type ReputationEventType,
  type ReputationSummary,
} from "@/domains/reputation/policy";

export type ReputationSqlExecutor = <Row extends Record<string, unknown>>(
  query: SQL,
) => Promise<{ rows: Row[] }>;

const eventInputSchema = z.object({
  groupId: z.string().uuid(),
  recipientUserId: z.string().uuid(),
  actorUserId: z.string().uuid().nullable(),
  eventType: reputationEventTypeSchema,
  sourceEntityId: z.string().uuid(),
});

const summaryInputSchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
});

// Queries using this predicate must alias reputation_events as event.
export const visibleReputationEventSql = sql`(
  event.source_entity_type <> 'outcome' or exists (
    select 1 from outcomes outcome
    where outcome.id = event.source_entity_id and outcome.group_id = event.group_id
      and outcome.visibility = 'group' and outcome.consent_granted_at is not null
      and outcome.shared_at is not null
  )
)`;

function sourceAuthorizationSql(input: z.infer<typeof eventInputSchema>) {
  if (input.eventType === "job_shared") {
    return sql`exists (
      select 1 from job_shares source
      where source.id = ${input.sourceEntityId}
        and source.group_id = ${input.groupId}
        and source.sharer_id = ${input.recipientUserId}
    )`;
  }

  if (input.eventType === "job_saved_by_member") {
    return sql`exists (
      select 1 from job_shares source
      where source.id = ${input.sourceEntityId}
        and source.group_id = ${input.groupId}
        and source.sharer_id = ${input.recipientUserId}
        and source.sharer_id <> ${input.actorUserId}
    )`;
  }

  if (input.eventType === "application_attributed") {
    return sql`exists (
      select 1
      from applications source
      inner join job_shares share
        on share.job_id = source.job_id
        and share.group_id = source.source_group_id
        and share.sharer_id = ${input.recipientUserId}
      where source.id = ${input.sourceEntityId}
        and source.source_group_id = ${input.groupId}
        and source.user_id = ${input.actorUserId}
        and source.user_id <> ${input.recipientUserId}
        and source.status <> 'saved'
    )`;
  }

  if (input.eventType === "referral_completed") {
    return sql`exists (
      select 1 from referral_requests source
      where source.id = ${input.sourceEntityId}
        and source.group_id = ${input.groupId}
        and source.potential_referrer_id = ${input.recipientUserId}
        and source.requester_id = ${input.actorUserId}
        and exists (
          select 1 from referral_request_state_events event
          where event.request_id = source.id and event.to_state = 'referred'
        )
    )`;
  }

  const outcomeType =
    input.eventType === "interview_helped" ? "interview" : "hired";
  return sql`exists (
    select 1 from outcomes source
    where source.id = ${input.sourceEntityId}
      and source.group_id = ${input.groupId}
      and source.subject_user_id = ${input.actorUserId}
      and (
        source.shared_by_user_id = ${input.recipientUserId}
        or source.referred_by_user_id = ${input.recipientUserId}
      )
      and source.outcome_type = ${outcomeType}
      and source.subject_user_id <> ${input.recipientUserId}
      and source.visibility = 'group'
      and source.shared_at is not null
      and source.consent_granted_at is not null
      and (
        source.shared_by_user_id = ${input.recipientUserId} and exists (
          select 1 from job_shares share where share.group_id = source.group_id
            and share.job_id = source.job_id and share.sharer_id = ${input.recipientUserId})
        or source.referred_by_user_id = ${input.recipientUserId} and exists (
          select 1 from referral_requests request
          inner join referral_request_state_events event on event.request_id = request.id
          where request.group_id = source.group_id and request.job_id = source.job_id
            and request.requester_id = source.subject_user_id
            and request.potential_referrer_id = ${input.recipientUserId}
            and event.to_state = 'referred' and event.changed_by_user_id = ${input.recipientUserId})
      )
  )`;
}

export async function recalculateReputationSummary(
  execute: ReputationSqlExecutor,
  input: { groupId: string; userId: string },
): Promise<ReputationSummary | null> {
  const values = summaryInputSchema.parse(input);
  const result = await execute<ReputationSummary>(sql`
    insert into user_reputation_summaries (
      group_id,
      user_id,
      total_points,
      jobs_shared,
      jobs_saved_by_members,
      applications_attributed,
      referrals_completed,
      interviews_helped,
      hires_helped,
      calculated_at
    )
    select
      membership.group_id,
      membership.user_id,
      coalesce(sum(event.points), 0)::int,
      count(*) filter (where event.event_type = 'job_shared')::int,
      count(*) filter (where event.event_type = 'job_saved_by_member')::int,
      count(*) filter (where event.event_type = 'application_attributed')::int,
      count(*) filter (where event.event_type = 'referral_completed')::int,
      count(*) filter (where event.event_type = 'interview_helped')::int,
      count(*) filter (where event.event_type = 'hire_helped')::int,
      now()
    from group_memberships membership
    left join reputation_events event
      on event.group_id = membership.group_id
      and event.recipient_user_id = membership.user_id
      and ${visibleReputationEventSql}
    where membership.group_id = ${values.groupId}
      and membership.user_id = ${values.userId}
      and membership.status = 'active'
    group by membership.group_id, membership.user_id
    on conflict (group_id, user_id) do update
    set
      total_points = excluded.total_points,
      jobs_shared = excluded.jobs_shared,
      jobs_saved_by_members = excluded.jobs_saved_by_members,
      applications_attributed = excluded.applications_attributed,
      referrals_completed = excluded.referrals_completed,
      interviews_helped = excluded.interviews_helped,
      hires_helped = excluded.hires_helped,
      calculated_at = excluded.calculated_at
    returning
      total_points as "totalPoints",
      jobs_shared as "jobsShared",
      jobs_saved_by_members as "jobsSavedByMembers",
      applications_attributed as "applicationsAttributed",
      referrals_completed as "referralsCompleted",
      interviews_helped as "interviewsHelped",
      hires_helped as "hiresHelped"
  `);

  return result.rows[0] ?? null;
}

export async function recordReputationEvent(
  execute: ReputationSqlExecutor,
  input: {
    groupId: string;
    recipientUserId: string;
    actorUserId: string | null;
    eventType: ReputationEventType;
    sourceEntityId: string;
  },
) {
  const values = eventInputSchema.parse(input);
  const policy = reputationEventPolicy[values.eventType];
  const actorRequired = values.eventType !== "job_shared";
  if (actorRequired && !values.actorUserId) return null;
  const sourceAllowed = sourceAuthorizationSql(values);
  const actorAllowed = values.actorUserId
    ? sql`exists (
        select 1 from group_memberships actor
        where actor.group_id = ${values.groupId}
          and actor.user_id = ${values.actorUserId}
          and actor.status = 'active'
      )`
    : sql`true`;

  const result = await execute<{ id: string; points: number }>(sql`
    insert into reputation_events (
      group_id,
      recipient_user_id,
      actor_user_id,
      event_type,
      source_entity_type,
      source_entity_id,
      points
    )
    select
      ${values.groupId},
      ${values.recipientUserId},
      ${values.actorUserId},
      ${values.eventType},
      ${policy.sourceEntityType},
      ${values.sourceEntityId},
      case
        when ${values.eventType} = 'job_shared' and (
          select count(*)
          from reputation_events recent
          where recent.group_id = ${values.groupId}
            and recent.recipient_user_id = ${values.recipientUserId}
            and recent.event_type = 'job_shared'
            and recent.points > 0
            and recent.created_at >= date_trunc('day', now())
        ) >= 3 then 0
        else ${policy.points}
      end
    where exists (
      select 1 from group_memberships recipient
      where recipient.group_id = ${values.groupId}
        and recipient.user_id = ${values.recipientUserId}
        and recipient.status = 'active'
    )
      and ${actorAllowed}
      and ${sourceAllowed}
    on conflict do nothing
    returning id, points
  `);
  const event = result.rows[0];
  if (!event) return null;

  await recalculateReputationSummary(execute, {
    groupId: values.groupId,
    userId: values.recipientUserId,
  });
  return event;
}
