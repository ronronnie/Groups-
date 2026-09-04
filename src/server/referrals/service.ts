import { sql, type SQL } from "drizzle-orm";
import { groupProfileDetailsAllowedSql } from "@/server/groups/privacy";
import { z } from "zod";
import {
  canTransitionReferral,
  createReferralRequestSchema,
  rankPotentialReferrers,
  transitionReferralRequestSchema,
  type PotentialReferrer,
  type ReferralActor,
  type ReferralState,
  type ReferrerMatchCandidate,
} from "@/domains/referrals/workflow";
import { recordReputationEvent } from "@/server/reputation/service";

export type ReferralSqlExecutor = <Row extends Record<string, unknown>>(
  query: SQL,
) => Promise<{ rows: Row[] }>;

export type ReferralTimelineEvent = {
  id: string;
  fromState: ReferralState | null;
  toState: ReferralState;
  changedByName: string;
  note: string | null;
  createdAt: Date;
};

export type ReferralRequestItem = {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterContext: string;
  potentialReferrerId: string;
  potentialReferrerName: string;
  referrerContext: string[];
  jobId: string;
  jobTitle: string;
  company: string;
  message: string;
  state: ReferralState;
  createdAt: Date;
  updatedAt: Date;
  timeline: ReferralTimelineEvent[];
};

type PotentialReferrerRow = ReferrerMatchCandidate & {
  existingRequestState: ReferralState | null;
};

type ReferralRequestRow = Omit<
  ReferralRequestItem,
  "createdAt" | "updatedAt" | "timeline" | "referrerContext"
> & {
  referrerCompany: string | null;
  referrerRole: string | null;
  referrerSharedJob: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  timeline: Array<
    Omit<ReferralTimelineEvent, "createdAt"> & { createdAt: Date | string }
  >;
};

export type PotentialReferrerOption = PotentialReferrer & {
  existingRequestState: ReferralState | null;
};

const identitySchema = z.object({
  groupId: z.string().uuid(),
  jobId: z.string().uuid(),
  viewerId: z.string().uuid(),
});

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

export async function listPotentialReferrers(
  execute: ReferralSqlExecutor,
  input: { groupId: string; jobId: string; viewerId: string },
): Promise<PotentialReferrerOption[] | null> {
  const values = identitySchema.parse(input);
  const jobResult = await execute<{ company: string; title: string }>(sql`
    select job.company, job.title
    from jobs job
    inner join active_job_shares share
      on share.job_id = job.id and share.group_id = ${values.groupId}
    inner join group_memberships viewer
      on viewer.group_id = share.group_id
      and viewer.user_id = ${values.viewerId}
      and viewer.status = 'active'
    where job.id = ${values.jobId}
    limit 1
  `);
  const job = jobResult.rows[0];
  if (!job) return null;

  const result = await execute<PotentialReferrerRow>(sql`
    select
      membership.user_id as "userId",
      case when profile.visibility in ('groups', 'public') and ${groupProfileDetailsAllowedSql(sql`membership.group_id`)} then profile.display_name else member.name end as "displayName",
      case
        when (profile.visibility in ('groups', 'public') and ${groupProfileDetailsAllowedSql(sql`membership.group_id`)})
          and coalesce(
            (profile.privacy_settings ->> 'showCurrentCompany')::boolean,
            false
          )
          then profile.current_company
        else null
      end as "currentCompany",
      case
        when (profile.visibility in ('groups', 'public') and ${groupProfileDetailsAllowedSql(sql`membership.group_id`)})
          then nullif(profile.current_role, '')
        else null
      end as "currentRole",
      exists (
        select 1 from active_job_shares candidate_share
        where candidate_share.group_id = membership.group_id
          and candidate_share.job_id = ${values.jobId}
          and candidate_share.sharer_id = membership.user_id
      ) as "sharedJob",
      (
        select request.state
        from referral_requests request
        where request.group_id = membership.group_id
          and request.job_id = ${values.jobId}
          and request.requester_id = ${values.viewerId}
          and request.potential_referrer_id = membership.user_id
          and request.state in ('requested', 'accepted', 'needs_info', 'referred')
        order by request.created_at desc
        limit 1
      ) as "existingRequestState"
    from group_memberships membership
    inner join users member on member.id = membership.user_id
    left join profiles profile on profile.user_id = membership.user_id
    where membership.group_id = ${values.groupId}
      and membership.status = 'active'
      and membership.user_id <> ${values.viewerId}
  `);

  const existingStates = new Map(
    result.rows.map((candidate) => [
      candidate.userId,
      candidate.existingRequestState,
    ]),
  );

  return rankPotentialReferrers(job, result.rows).map((candidate) => ({
    ...candidate,
    existingRequestState: existingStates.get(candidate.userId) ?? null,
  }));
}

export async function createReferralRequest(
  execute: ReferralSqlExecutor,
  input: {
    groupId: string;
    jobId: string;
    requesterId: string;
    potentialReferrerId: string;
    message: string;
  },
) {
  const values = createReferralRequestSchema
    .extend({ requesterId: z.string().uuid() })
    .parse(input);
  if (values.requesterId === values.potentialReferrerId) return null;

  const candidates = await listPotentialReferrers(execute, {
    groupId: values.groupId,
    jobId: values.jobId,
    viewerId: values.requesterId,
  });
  const candidate = candidates?.find(
    (option) => option.userId === values.potentialReferrerId,
  );
  if (!candidate || candidate.existingRequestState) return null;

  const result = await execute<{ requestId: string }>(sql`
    with new_request as (
      insert into referral_requests (
        requester_id,
        potential_referrer_id,
        job_id,
        group_id,
        message,
        state
      )
      select
        ${values.requesterId},
        ${values.potentialReferrerId},
        ${values.jobId},
        ${values.groupId},
        ${values.message},
        'requested'
      where exists (
        select 1 from group_memberships requester
        where requester.group_id = ${values.groupId}
          and requester.user_id = ${values.requesterId}
          and requester.status = 'active'
      )
        and exists (
          select 1 from group_memberships referrer
          where referrer.group_id = ${values.groupId}
            and referrer.user_id = ${values.potentialReferrerId}
            and referrer.status = 'active'
        )
        and exists (
          select 1 from active_job_shares share
          where share.group_id = ${values.groupId}
            and share.job_id = ${values.jobId}
        )
      on conflict do nothing
      returning id
    ),
    initial_event as (
      insert into referral_request_state_events (
        request_id,
        from_state,
        to_state,
        changed_by_user_id
      )
      select id, null, 'requested', ${values.requesterId}
      from new_request
      returning request_id
    )
    select new_request.id as "requestId"
    from new_request
    inner join initial_event on initial_event.request_id = new_request.id
  `);

  return result.rows[0] ?? null;
}

export async function listReferralRequests(
  execute: ReferralSqlExecutor,
  input: { groupId: string; viewerId: string },
): Promise<ReferralRequestItem[] | null> {
  const values = z
    .object({ groupId: z.string().uuid(), viewerId: z.string().uuid() })
    .parse(input);
  const membership = await execute<{ role: "owner" | "admin" | "member" }>(sql`
    select role
    from group_memberships
    where group_id = ${values.groupId}
      and user_id = ${values.viewerId}
      and status = 'active'
    limit 1
  `);
  const role = membership.rows[0]?.role;
  if (!role) return null;
  const canReviewGroup = role === "owner" || role === "admin";

  const result = await execute<ReferralRequestRow>(sql`
    select
      request.id,
      request.requester_id as "requesterId",
      case when requester_profile.visibility in ('groups', 'public') and ${groupProfileDetailsAllowedSql(sql`request.group_id`)}
        then requester_profile.display_name else requester.name end as "requesterName",
      case
        when (requester_profile.visibility in ('groups', 'public') and ${groupProfileDetailsAllowedSql(sql`request.group_id`)})
          and nullif(requester_profile.current_role, '') is not null
          then requester_profile.current_role
        else 'Fellow group member'
      end as "requesterContext",
      request.potential_referrer_id as "potentialReferrerId",
      case when referrer_profile.visibility in ('groups', 'public') and ${groupProfileDetailsAllowedSql(sql`request.group_id`)}
        then referrer_profile.display_name else referrer.name end as "potentialReferrerName",
      case
        when (referrer_profile.visibility in ('groups', 'public') and ${groupProfileDetailsAllowedSql(sql`request.group_id`)})
          and coalesce(
            (referrer_profile.privacy_settings ->> 'showCurrentCompany')::boolean,
            false
          )
          then referrer_profile.current_company
        else null
      end as "referrerCompany",
      case
        when (referrer_profile.visibility in ('groups', 'public') and ${groupProfileDetailsAllowedSql(sql`request.group_id`)})
          then nullif(referrer_profile.current_role, '')
        else null
      end as "referrerRole",
      exists (
        select 1 from active_job_shares referrer_share
        where referrer_share.group_id = request.group_id
          and referrer_share.job_id = request.job_id
          and referrer_share.sharer_id = request.potential_referrer_id
      ) as "referrerSharedJob",
      request.job_id as "jobId",
      job.title as "jobTitle",
      job.company,
      request.message,
      request.state,
      request.created_at as "createdAt",
      request.updated_at as "updatedAt",
      coalesce(history.events, '[]'::json) as timeline
    from referral_requests request
    inner join jobs job on job.id = request.job_id
    inner join users requester on requester.id = request.requester_id
    inner join users referrer on referrer.id = request.potential_referrer_id
    left join profiles requester_profile
      on requester_profile.user_id = request.requester_id
    left join profiles referrer_profile
      on referrer_profile.user_id = request.potential_referrer_id
    left join lateral (
      select json_agg(
        json_build_object(
          'id', event.id,
          'fromState', event.from_state,
          'toState', event.to_state,
          'changedByName', coalesce(actor_profile.display_name, actor.name),
          'note', event.note,
          'createdAt', event.created_at
        ) order by event.created_at desc, event.id desc
      ) as events
      from referral_request_state_events event
      inner join users actor on actor.id = event.changed_by_user_id
      left join profiles actor_profile on actor_profile.user_id = actor.id
      where event.request_id = request.id
    ) history on true
    where request.group_id = ${values.groupId}
      and (
        request.requester_id = ${values.viewerId}
        or request.potential_referrer_id = ${values.viewerId}
        or ${canReviewGroup}
      )
    order by request.updated_at desc, request.id desc
  `);

  return result.rows.map((row) => {
    const match = rankPotentialReferrers(
      { company: row.company, title: row.jobTitle },
      [
        {
          userId: row.potentialReferrerId,
          displayName: row.potentialReferrerName,
          currentCompany: row.referrerCompany,
          currentRole: row.referrerRole,
          sharedJob: row.referrerSharedJob,
        },
      ],
      1,
    )[0];

    return {
      id: row.id,
      requesterId: row.requesterId,
      requesterName: row.requesterName,
      requesterContext: row.requesterContext,
      potentialReferrerId: row.potentialReferrerId,
      potentialReferrerName: row.potentialReferrerName,
      referrerContext: match?.context ?? ["Fellow group member"],
      jobId: row.jobId,
      jobTitle: row.jobTitle,
      company: row.company,
      message: row.message,
      state: row.state,
      createdAt: toDate(row.createdAt),
      updatedAt: toDate(row.updatedAt),
      timeline: row.timeline.map((event) => ({
        ...event,
        createdAt: toDate(event.createdAt),
      })),
    };
  });
}

export async function transitionReferralRequest(
  execute: ReferralSqlExecutor,
  input: {
    groupId: string;
    requestId: string;
    userId: string;
    nextState: ReferralState;
    note: string;
  },
) {
  const values = transitionReferralRequestSchema
    .extend({ userId: z.string().uuid() })
    .parse(input);
  const currentResult = await execute<{
    requesterId: string;
    potentialReferrerId: string;
    state: ReferralState;
  }>(sql`
    select
      request.requester_id as "requesterId",
      request.potential_referrer_id as "potentialReferrerId",
      request.state
    from referral_requests request
    inner join group_memberships viewer
      on viewer.group_id = request.group_id
      and viewer.user_id = ${values.userId}
      and viewer.status = 'active'
    where request.id = ${values.requestId}
      and request.group_id = ${values.groupId}
      and (
        request.requester_id = ${values.userId}
        or request.potential_referrer_id = ${values.userId}
      )
    limit 1
  `);
  const current = currentResult.rows[0];
  if (!current) return null;

  const actor: ReferralActor =
    current.requesterId === values.userId ? "requester" : "referrer";
  if (!canTransitionReferral(actor, current.state, values.nextState)) {
    return null;
  }

  const result = await execute<{ requestId: string }>(sql`
    with updated_request as (
      update referral_requests request
      set
        state = ${values.nextState},
        responded_at = case
          when ${actor} = 'referrer' then coalesce(request.responded_at, now())
          else request.responded_at
        end,
        completed_at = case
          when ${values.nextState} in ('referred', 'closed') then now()
          else request.completed_at
        end,
        updated_at = now()
      where request.id = ${values.requestId}
        and request.group_id = ${values.groupId}
        and request.state = ${current.state}
        and exists (
          select 1 from group_memberships requester
          where requester.group_id = request.group_id
            and requester.user_id = request.requester_id
            and requester.status = 'active'
        )
        and exists (
          select 1 from group_memberships referrer
          where referrer.group_id = request.group_id
            and referrer.user_id = request.potential_referrer_id
            and referrer.status = 'active'
        )
      returning id
    ),
    recorded_event as (
      insert into referral_request_state_events (
        request_id,
        from_state,
        to_state,
        changed_by_user_id,
        note
      )
      select
        id,
        ${current.state},
        ${values.nextState},
        ${values.userId},
        nullif(${values.note}, '')
      from updated_request
      returning request_id
    )
    select updated_request.id as "requestId"
    from updated_request
    inner join recorded_event on recorded_event.request_id = updated_request.id
  `);

  const transition = result.rows[0] ?? null;
  if (transition && values.nextState === "referred") {
    await recordReputationEvent(execute, {
      groupId: values.groupId,
      recipientUserId: current.potentialReferrerId,
      actorUserId: current.requesterId,
      eventType: "referral_completed",
      sourceEntityId: transition.requestId,
    });
  }
  return transition;
}
