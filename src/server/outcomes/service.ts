import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import {
  outcomeStage,
  outcomeVisibilitySchema,
  recordOutcomeSchema,
  type OutcomeType,
} from "@/domains/outcomes/outcome";
import { reputationEventPolicy } from "@/domains/reputation/policy";

export type OutcomeSqlExecutor = <Row extends Record<string, unknown>>(
  query: SQL,
) => Promise<{ rows: Row[] }>;

const identitySchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
});

function membershipSql(groupId: string, userId: string) {
  return sql`exists (
    select 1 from group_memberships
    where group_id = ${groupId} and user_id = ${userId} and status = 'active'
  )`;
}

export type OutcomeItem = {
  id: string;
  jobId: string;
  subjectUserId: string;
  subjectName: string;
  company: string;
  title: string;
  outcomeType: OutcomeType;
  visibility: "private" | "group";
  sharerName: string | null;
  referrerName: string | null;
};

export async function listOutcomes(
  execute: OutcomeSqlExecutor,
  input: {
    groupId: string;
    userId: string;
    scope: "mine" | "group";
  },
): Promise<OutcomeItem[]> {
  const values = identitySchema
    .extend({ scope: z.enum(["mine", "group"]) })
    .parse(input);
  const result = await execute<OutcomeItem>(sql`
    select outcome.id, outcome.job_id as "jobId", outcome.subject_user_id as "subjectUserId",
      subject.name as "subjectName", job.company, job.title,
      outcome.outcome_type as "outcomeType", outcome.visibility,
      sharer.name as "sharerName", referrer.name as "referrerName"
    from outcomes outcome
    inner join jobs job on job.id = outcome.job_id
    inner join users subject on subject.id = outcome.subject_user_id
    left join users sharer on sharer.id = outcome.shared_by_user_id
    left join users referrer on referrer.id = outcome.referred_by_user_id
    where outcome.group_id = ${values.groupId}
      and ${membershipSql(values.groupId, values.userId)}
      and (${values.scope} = 'mine' and outcome.subject_user_id = ${values.userId}
        or ${values.scope} = 'group' and outcome.visibility = 'group'
          and outcome.consent_granted_at is not null and outcome.shared_at is not null)
    order by outcome.created_at desc, outcome.id desc
    limit 100
  `);
  return result.rows;
}

export async function recordPrivateOutcome(
  execute: OutcomeSqlExecutor,
  input: z.infer<typeof recordOutcomeSchema> & { userId: string },
) {
  const values = recordOutcomeSchema
    .extend({ userId: z.string().uuid() })
    .parse(input);
  const stage = outcomeStage[values.outcomeType];
  const result = await execute<{ id: string }>(sql`
    insert into outcomes (group_id, job_id, subject_user_id, outcome_type,
      shared_by_user_id, referred_by_user_id)
    select ${values.groupId}, application.job_id, ${values.userId}, ${values.outcomeType},
      case when ${values.creditSharer} then (
        select share.sharer_id from job_shares share
        where share.group_id = ${values.groupId} and share.job_id = application.job_id
          and share.sharer_id <> ${values.userId}
          and share.shared_at <= application.created_at
          and exists (select 1 from group_memberships member
            where member.group_id = share.group_id
              and member.user_id = share.sharer_id and member.status = 'active')
        order by share.shared_at, share.id limit 1
      ) end,
      case when ${values.creditReferrer} then (
        select request.potential_referrer_id from referral_requests request
        where request.group_id = ${values.groupId} and request.job_id = application.job_id
          and request.requester_id = ${values.userId}
          and request.potential_referrer_id <> ${values.userId}
          and exists (select 1 from referral_request_state_events event
            where event.request_id = request.id and event.to_state = 'referred'
              and event.changed_by_user_id = request.potential_referrer_id)
          and exists (select 1 from group_memberships member
            where member.group_id = request.group_id
              and member.user_id = request.potential_referrer_id and member.status = 'active')
        order by request.completed_at desc nulls last, request.id limit 1
      ) end
    from applications application
    where application.id = ${values.applicationId} and application.user_id = ${values.userId}
      and application.source_group_id = ${values.groupId}
      and ${membershipSql(values.groupId, values.userId)}
      and (application.status = ${stage} or exists (
        select 1 from application_status_events event
        where event.application_id = application.id and event.to_status = ${stage}
      ))
      and exists (select 1 from job_shares share
        where share.group_id = ${values.groupId} and share.job_id = application.job_id)
    on conflict (subject_user_id, job_id, outcome_type) do nothing
    returning id
  `);
  return result.rows[0] ?? null;
}

export async function setOutcomeVisibility(
  execute: OutcomeSqlExecutor,
  input: z.infer<typeof outcomeVisibilitySchema> & { userId: string },
) {
  const values = outcomeVisibilitySchema.parse(input);
  const userId = z.string().uuid().parse(input.userId);
  const sharing = values.visibility === "group";
  // One statement locks the outcome and changes visibility, credit and cache together.
  // Credit evidence stays append-only; withdrawing consent removes its visible effect.
  const result = await execute<{ id: string }>(sql`
    with current_outcome as materialized (
      select * from outcomes outcome
      where outcome.id = ${values.outcomeId} and outcome.group_id = ${values.groupId}
        and outcome.subject_user_id = ${userId}
        and ${membershipSql(values.groupId, userId)}
      for update
    ), changed as (
      update outcomes outcome set visibility = ${values.visibility},
        consent_granted_at = case when ${sharing} then now() else null end,
        shared_at = case when ${sharing} then now() else null end, updated_at = now()
      from current_outcome current
      where outcome.id = current.id and current.visibility <> ${values.visibility}
      returning outcome.*
    ), credited as (
      insert into reputation_events (group_id, recipient_user_id, actor_user_id,
        event_type, source_entity_type, source_entity_id, points)
      select distinct outcome.group_id, recipient.user_id, outcome.subject_user_id,
        case when outcome.outcome_type = 'interview' then 'interview_helped' else 'hire_helped' end,
        'outcome', outcome.id,
        case when outcome.outcome_type = 'interview'
          then ${reputationEventPolicy.interview_helped.points}::int else ${reputationEventPolicy.hire_helped.points}::int end
      from changed outcome
      cross join lateral (values (outcome.shared_by_user_id), (outcome.referred_by_user_id)) recipient(user_id)
      where ${sharing} and outcome.outcome_type in ('interview', 'hired')
        and recipient.user_id <> outcome.subject_user_id
        and exists (select 1 from group_memberships member
          where member.group_id = outcome.group_id and member.user_id = recipient.user_id
            and member.status = 'active')
        and (
          recipient.user_id = outcome.shared_by_user_id and exists (
            select 1 from job_shares share where share.group_id = outcome.group_id
              and share.job_id = outcome.job_id and share.sharer_id = recipient.user_id)
          or recipient.user_id = outcome.referred_by_user_id and exists (
            select 1 from referral_requests request
            inner join referral_request_state_events event on event.request_id = request.id
            where request.group_id = outcome.group_id and request.job_id = outcome.job_id
              and request.requester_id = outcome.subject_user_id
              and request.potential_referrer_id = recipient.user_id
              and event.to_state = 'referred' and event.changed_by_user_id = recipient.user_id)
        )
      on conflict do nothing returning *
    ), affected_credit as (
      select event.* from reputation_events event
      inner join changed outcome on outcome.id = event.source_entity_id
        and outcome.group_id = event.group_id and event.source_entity_type = 'outcome'
      union all select * from credited
    ), credit_deltas as (
      select group_id, recipient_user_id,
        (sum(points) * ${sharing ? 1 : -1})::int as points,
        (count(*) filter (where event_type = 'interview_helped') * ${sharing ? 1 : -1})::int as interviews,
        (count(*) filter (where event_type = 'hire_helped') * ${sharing ? 1 : -1})::int as hires
      from affected_credit group by group_id, recipient_user_id
    ), visible_credit as (
      select event.* from reputation_events event
      where event.group_id = ${values.groupId}
        and event.recipient_user_id in (select recipient_user_id from credit_deltas)
        and (event.source_entity_type <> 'outcome' or exists (
          select 1 from outcomes outcome
          where outcome.id = event.source_entity_id and outcome.group_id = event.group_id
            and case when outcome.id in (select id from changed) then ${sharing}
              else outcome.visibility = 'group' and outcome.consent_granted_at is not null
                and outcome.shared_at is not null end
        ))
      union all select * from credited
    ), summaries as (
      insert into user_reputation_summaries (group_id, user_id, total_points,
        jobs_shared, jobs_saved_by_members, applications_attributed, referrals_completed,
        interviews_helped, hires_helped)
      select delta.group_id, delta.recipient_user_id, coalesce(sum(event.points), 0)::int,
        count(*) filter (where event.event_type = 'job_shared')::int,
        count(*) filter (where event.event_type = 'job_saved_by_member')::int,
        count(*) filter (where event.event_type = 'application_attributed')::int,
        count(*) filter (where event.event_type = 'referral_completed')::int,
        count(*) filter (where event.event_type = 'interview_helped')::int,
        count(*) filter (where event.event_type = 'hire_helped')::int
      from credit_deltas delta left join visible_credit event
        on event.group_id = delta.group_id and event.recipient_user_id = delta.recipient_user_id
      group by delta.group_id, delta.recipient_user_id
      on conflict (group_id, user_id) do update set
        total_points = user_reputation_summaries.total_points + (select points from credit_deltas
          where group_id = excluded.group_id and recipient_user_id = excluded.user_id),
        interviews_helped = user_reputation_summaries.interviews_helped + (select interviews from credit_deltas
          where group_id = excluded.group_id and recipient_user_id = excluded.user_id),
        hires_helped = user_reputation_summaries.hires_helped + (select hires from credit_deltas
          where group_id = excluded.group_id and recipient_user_id = excluded.user_id),
        calculated_at = now()
      returning user_id
    ), cleared_index as (
      delete from group_knowledge_documents document
      where document.group_id = ${values.groupId} and (
        document.source_kind = 'outcome' and document.source_id in (select id from changed)
        or document.source_kind = 'reputation' and document.source_id in (select user_id from summaries))
    )
    select id from current_outcome
  `);
  return result.rows[0] ?? null;
}
