import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import {
  defaultNotificationPreferences,
  digestCadenceSchema,
  notificationCategorySchema,
  notificationEventTypeSchema,
  notificationPreferencesSchema,
  type NotificationCategory,
  type NotificationEventType,
  type NotificationPreferences,
} from "@/domains/notifications/events";
import { getForYouFeed } from "@/server/jobs/feed-service";

export type NotificationSqlExecutor = <Row extends Record<string, unknown>>(
  query: SQL,
) => Promise<{ rows: Row[] }>;

export type NotificationItem = {
  id: string;
  type: NotificationEventType;
  title: string;
  body: string;
  actionUrl: string | null;
  groupName: string | null;
  readAt: Date | null;
  createdAt: Date;
};

const idSchema = z.string().uuid();
const appUrlSchema = z.string().startsWith("/app").max(500);
const eventInputSchema = z.object({
  groupId: idSchema,
  actorUserId: idSchema.nullable(),
  recipientUserId: idSchema.nullable(),
  eventType: notificationEventTypeSchema,
  entityType: z.string().trim().min(1).max(80),
  entityId: idSchema.nullable(),
  visibility: z.enum(["private", "group", "admin"]),
  category: notificationCategorySchema.nullable(),
  recipientIds: z.array(idSchema).max(1_000),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(300),
  actionUrl: appUrlSchema.nullable(),
  dedupeKey: z.string().trim().min(1).max(300),
  summary: z.string().trim().min(1).max(300),
});

type EventInput = z.infer<typeof eventInputSchema>;

type NotificationRow = Omit<NotificationItem, "createdAt" | "readAt"> & {
  readAt: Date | string | null;
  createdAt: Date | string;
};

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function preferenceSql(category: NotificationCategory) {
  if (category === "strong_matches") {
    return sql`coalesce(preference.strong_matches_enabled, true)`;
  }
  if (category === "referrals") {
    return sql`coalesce(preference.referral_requests_enabled, true)`;
  }
  if (category === "application_reminders") {
    return sql`coalesce(preference.application_reminders_enabled, true)`;
  }
  if (category === "job_activity") {
    return sql`coalesce(preference.job_activity_enabled, (notification_group.settings ->> 'jobNotificationsDefault')::boolean, true)`;
  }
  return sql`coalesce(preference.group_activity_enabled, (notification_group.settings ->> 'groupNotificationsDefault')::boolean, true)`;
}

export async function emitActivityEvent(
  execute: NotificationSqlExecutor,
  input: EventInput,
) {
  const event = eventInputSchema.parse(input);
  if (event.visibility === "private" && !event.recipientUserId) {
    throw new Error("Private activity events require a recipient.");
  }
  if (event.recipientUserId && event.recipientIds.length > 1) {
    throw new Error("Recipient-scoped events can route to only one user.");
  }

  const metadata = JSON.stringify({ summary: event.summary });
  const payload = JSON.stringify({ title: event.title, body: event.body });
  const recipients = JSON.stringify([...new Set(event.recipientIds)]);
  const category = event.category;
  const result = await execute<{ eventId: string; notificationCount: number }>(
    sql`
      with saved_event as (
        insert into activity_events (
          group_id,
          actor_user_id,
          recipient_user_id,
          event_type,
          entity_type,
          entity_id,
          visibility,
          metadata,
          dedupe_key
        ) values (
          ${event.groupId},
          ${event.actorUserId},
          ${event.recipientUserId},
          ${event.eventType},
          ${event.entityType},
          ${event.entityId},
          ${event.visibility},
          ${metadata}::jsonb,
          ${event.dedupeKey}
        )
        on conflict (dedupe_key) do update
        set dedupe_key = excluded.dedupe_key
        returning id
      ),
      routed_recipients as (
        select jsonb_array_elements_text(${recipients}::jsonb)::uuid as user_id
      ),
      saved_notifications as (
        insert into notifications (
          user_id,
          group_id,
          activity_event_id,
          type,
          action_url,
          dedupe_key,
          payload
        )
        select
          recipient.user_id,
          ${event.groupId},
          saved_event.id,
          ${event.eventType},
          ${event.actionUrl},
          ${event.dedupeKey} || ':' || recipient.user_id::text,
          ${payload}::jsonb
        from saved_event
        inner join routed_recipients recipient on true
        inner join group_memberships membership
          on membership.group_id = ${event.groupId}
          and membership.user_id = recipient.user_id
          and membership.status = 'active'
        left join notification_preferences preference
          on preference.user_id = recipient.user_id
        inner join groups notification_group on notification_group.id = membership.group_id
        where ${category !== null}
          and coalesce(preference.in_app_enabled, true)
          and ${category ? preferenceSql(category) : sql`false`}
        on conflict (dedupe_key) do nothing
        returning id
      )
      select
        saved_event.id as "eventId",
        (select count(*)::int from saved_notifications) as "notificationCount"
      from saved_event
    `,
  );

  return result.rows[0] ?? null;
}

export async function getNotificationPreferences(
  execute: NotificationSqlExecutor,
  userId: string,
  groupId?: string,
): Promise<NotificationPreferences> {
  const validUserId = idSchema.parse(userId);
  const result = await execute<NotificationPreferences>(sql`
    select
      in_app_enabled as "inAppEnabled",
      strong_matches_enabled as "strongMatchesEnabled",
      referral_requests_enabled as "referralRequestsEnabled",
      application_reminders_enabled as "applicationRemindersEnabled",
      job_activity_enabled as "jobActivityEnabled",
      group_activity_enabled as "groupActivityEnabled",
      digest_cadence as "digestCadence"
    from notification_preferences
    where user_id = ${validUserId}
    limit 1
  `);

  if (!result.rows[0] && groupId) {
    const defaults = await execute<{ settings: Record<string, unknown> }>(sql`
      select g.settings from groups g inner join group_memberships member on member.group_id = g.id
      where g.id = ${idSchema.parse(groupId)} and member.user_id = ${validUserId} and member.status = 'active'`);
    const settings = defaults.rows[0]?.settings;
    return notificationPreferencesSchema.parse({
      ...defaultNotificationPreferences,
      jobActivityEnabled: settings?.jobNotificationsDefault ?? true,
      groupActivityEnabled: settings?.groupNotificationsDefault ?? true,
      digestCadence: settings?.digestCadenceDefault ?? "weekly",
    });
  }
  return notificationPreferencesSchema.parse(
    result.rows[0] ?? defaultNotificationPreferences,
  );
}

export async function updateNotificationPreferences(
  execute: NotificationSqlExecutor,
  userId: string,
  preferences: NotificationPreferences,
) {
  const validUserId = idSchema.parse(userId);
  const values = notificationPreferencesSchema.parse(preferences);
  const result = await execute<{ userId: string }>(sql`
    insert into notification_preferences (
      user_id,
      in_app_enabled,
      strong_matches_enabled,
      referral_requests_enabled,
      application_reminders_enabled,
      job_activity_enabled,
      group_activity_enabled,
      digest_cadence,
      updated_at
    ) values (
      ${validUserId},
      ${values.inAppEnabled},
      ${values.strongMatchesEnabled},
      ${values.referralRequestsEnabled},
      ${values.applicationRemindersEnabled},
      ${values.jobActivityEnabled},
      ${values.groupActivityEnabled},
      ${values.digestCadence},
      now()
    )
    on conflict (user_id) do update
    set
      in_app_enabled = excluded.in_app_enabled,
      strong_matches_enabled = excluded.strong_matches_enabled,
      referral_requests_enabled = excluded.referral_requests_enabled,
      application_reminders_enabled = excluded.application_reminders_enabled,
      job_activity_enabled = excluded.job_activity_enabled,
      group_activity_enabled = excluded.group_activity_enabled,
      digest_cadence = excluded.digest_cadence,
      updated_at = now()
    returning user_id as "userId"
  `);

  return result.rows[0] ?? null;
}

export async function listNotifications(
  execute: NotificationSqlExecutor,
  userId: string,
  limit = 50,
): Promise<NotificationItem[]> {
  const validUserId = idSchema.parse(userId);
  const validLimit = z.number().int().min(1).max(100).parse(limit);
  const result = await execute<NotificationRow>(sql`
    select
      notification.id,
      notification.type,
      coalesce(notification.payload ->> 'title', 'Update') as title,
      coalesce(notification.payload ->> 'body', '') as body,
      notification.action_url as "actionUrl",
      group_record.name as "groupName",
      notification.read_at as "readAt",
      notification.created_at as "createdAt"
    from notifications notification
    left join groups group_record on group_record.id = notification.group_id
    where notification.user_id = ${validUserId}
    order by notification.created_at desc, notification.id desc
    limit ${validLimit}
  `);

  return result.rows.map((row) => ({
    ...row,
    readAt: row.readAt ? toDate(row.readAt) : null,
    createdAt: toDate(row.createdAt),
  }));
}

export async function countUnreadNotifications(
  execute: NotificationSqlExecutor,
  userId: string,
) {
  const validUserId = idSchema.parse(userId);
  const result = await execute<{ count: number }>(sql`
    select count(*)::int as count
    from notifications
    where user_id = ${validUserId} and read_at is null
  `);
  return Number(result.rows[0]?.count ?? 0);
}

export async function markNotificationRead(
  execute: NotificationSqlExecutor,
  input: { userId: string; notificationId: string },
) {
  const values = z
    .object({ userId: idSchema, notificationId: idSchema })
    .parse(input);
  const result = await execute<{ id: string }>(sql`
    update notifications
    set read_at = coalesce(read_at, now())
    where id = ${values.notificationId} and user_id = ${values.userId}
    returning id
  `);
  return result.rows[0] ?? null;
}

export async function markAllNotificationsRead(
  execute: NotificationSqlExecutor,
  userId: string,
) {
  const validUserId = idSchema.parse(userId);
  const result = await execute<{ id: string }>(sql`
    update notifications
    set read_at = now()
    where user_id = ${validUserId} and read_at is null
    returning id
  `);
  return result.rows.length;
}

export async function createJobSharedEvent(
  execute: NotificationSqlExecutor,
  input: {
    groupId: string;
    actorUserId: string;
    jobId: string;
    shareId: string;
  },
) {
  const values = z
    .object({
      groupId: idSchema,
      actorUserId: idSchema,
      jobId: idSchema,
      shareId: idSchema,
    })
    .parse(input);
  const job = await execute<{ title: string; company: string }>(sql`
    select job.title, job.company
    from jobs job
    inner join active_job_shares share on share.job_id = job.id
    where share.id = ${values.shareId}
      and share.group_id = ${values.groupId}
      and share.sharer_id = ${values.actorUserId}
    limit 1
  `);
  const row = job.rows[0];
  if (!row) return null;

  return emitActivityEvent(execute, {
    groupId: values.groupId,
    actorUserId: values.actorUserId,
    recipientUserId: null,
    eventType: "job_shared",
    entityType: "job_share",
    entityId: values.shareId,
    visibility: "group",
    category: null,
    recipientIds: [],
    title: "Job shared",
    body: `${row.title} at ${row.company} was shared.`,
    actionUrl: null,
    dedupeKey: `job-shared:${values.shareId}`,
    summary: `${row.title} at ${row.company} was shared.`,
  });
}

export async function createStrongMatchEventsForJob(
  execute: NotificationSqlExecutor,
  input: {
    groupId: string;
    groupSlug: string;
    jobId: string;
    actorUserId: string;
    now?: Date;
  },
) {
  const values = z
    .object({
      groupId: idSchema,
      groupSlug: z.string().trim().min(1).max(160),
      jobId: idSchema,
      actorUserId: idSchema,
    })
    .parse(input);
  const members = await execute<{ userId: string }>(sql`
    select user_id as "userId"
    from group_memberships
    where group_id = ${values.groupId}
      and status = 'active'
      and user_id <> ${values.actorUserId}
  `);
  let created = 0;

  for (const member of members.rows) {
    const feed = await getForYouFeed(execute, {
      groupId: values.groupId,
      viewerId: member.userId,
      filter: "recommended",
      now: input.now,
    });
    const match = feed?.items.find((item) => item.id === values.jobId);
    if (!match || match.matchStrength !== "strong") continue;

    const routed = await emitActivityEvent(execute, {
      groupId: values.groupId,
      actorUserId: values.actorUserId,
      recipientUserId: member.userId,
      eventType: "strong_job_match",
      entityType: "job",
      entityId: values.jobId,
      visibility: "private",
      category: "strong_matches",
      recipientIds: [member.userId],
      title: "New strong job match",
      body: `${match.title} at ${match.company} looks like a strong match for you.`,
      actionUrl: `/app/groups/${values.groupSlug}/jobs/${values.jobId}`,
      dedupeKey: `strong-match:${values.groupId}:${values.jobId}:${member.userId}`,
      summary: "A member received a strong job match.",
    });
    created += routed?.notificationCount ?? 0;
  }

  return created;
}

export async function createJobSavedByMemberEvent(
  execute: NotificationSqlExecutor,
  input: {
    groupId: string;
    groupSlug: string;
    jobId: string;
    saverId: string;
  },
) {
  const values = z
    .object({
      groupId: idSchema,
      groupSlug: z.string().trim().min(1).max(160),
      jobId: idSchema,
      saverId: idSchema,
    })
    .parse(input);
  const result = await execute<{
    shareId: string;
    sharerId: string;
    title: string;
    company: string;
  }>(sql`
    select
      share.id as "shareId",
      share.sharer_id as "sharerId",
      job.title,
      job.company
    from active_job_shares share
    inner join jobs job on job.id = share.job_id
    inner join group_memberships saver
      on saver.group_id = share.group_id
      and saver.user_id = ${values.saverId}
      and saver.status = 'active'
    where share.group_id = ${values.groupId}
      and share.job_id = ${values.jobId}
      and share.sharer_id <> ${values.saverId}
    order by share.shared_at asc, share.id asc
    limit 1
  `);
  const row = result.rows[0];
  if (!row) return null;

  return emitActivityEvent(execute, {
    groupId: values.groupId,
    actorUserId: values.saverId,
    recipientUserId: row.sharerId,
    eventType: "job_saved_by_member",
    entityType: "job_share",
    entityId: row.shareId,
    visibility: "private",
    category: "job_activity",
    recipientIds: [row.sharerId],
    title: "Your job share helped",
    body: `A member saved ${row.title} at ${row.company}.`,
    actionUrl: `/app/groups/${values.groupSlug}/jobs/${values.jobId}`,
    dedupeKey: `job-saved:${values.groupId}:${values.jobId}:${values.saverId}`,
    summary: "A shared job was saved by a member.",
  });
}

export async function createReferralRequestReceivedEvent(
  execute: NotificationSqlExecutor,
  requestId: string,
) {
  const validRequestId = idSchema.parse(requestId);
  const result = await execute<{
    groupId: string;
    groupSlug: string;
    requesterId: string;
    potentialReferrerId: string;
    jobId: string;
    title: string;
    company: string;
  }>(sql`
    select
      request.group_id as "groupId",
      group_record.slug as "groupSlug",
      request.requester_id as "requesterId",
      request.potential_referrer_id as "potentialReferrerId",
      request.job_id as "jobId",
      job.title,
      job.company
    from referral_requests request
    inner join groups group_record on group_record.id = request.group_id
    inner join jobs job on job.id = request.job_id
    where request.id = ${validRequestId}
      and request.state = 'requested'
    limit 1
  `);
  const row = result.rows[0];
  if (!row) return null;

  return emitActivityEvent(execute, {
    groupId: row.groupId,
    actorUserId: row.requesterId,
    recipientUserId: row.potentialReferrerId,
    eventType: "referral_request_received",
    entityType: "referral_request",
    entityId: validRequestId,
    visibility: "private",
    category: "referrals",
    recipientIds: [row.potentialReferrerId],
    title: "Referral request received",
    body: `A member asked about a referral for ${row.title} at ${row.company}.`,
    actionUrl: `/app/groups/${row.groupSlug}/referrals`,
    dedupeKey: `referral-received:${validRequestId}`,
    summary: "A referral request was received.",
  });
}

export async function createReferralRequestUpdatedEvent(
  execute: NotificationSqlExecutor,
  input: { requestId: string; actorUserId: string },
) {
  const values = z
    .object({ requestId: idSchema, actorUserId: idSchema })
    .parse(input);
  const result = await execute<{
    groupId: string;
    groupSlug: string;
    requesterId: string;
    potentialReferrerId: string;
    state: string;
    title: string;
    company: string;
  }>(sql`
    select
      request.group_id as "groupId",
      group_record.slug as "groupSlug",
      request.requester_id as "requesterId",
      request.potential_referrer_id as "potentialReferrerId",
      request.state,
      job.title,
      job.company
    from referral_requests request
    inner join groups group_record on group_record.id = request.group_id
    inner join jobs job on job.id = request.job_id
    where request.id = ${values.requestId}
      and ${values.actorUserId} in (
        request.requester_id,
        request.potential_referrer_id
      )
    limit 1
  `);
  const row = result.rows[0];
  if (!row) return null;
  const recipientId =
    row.requesterId === values.actorUserId
      ? row.potentialReferrerId
      : row.requesterId;

  return emitActivityEvent(execute, {
    groupId: row.groupId,
    actorUserId: values.actorUserId,
    recipientUserId: recipientId,
    eventType: "referral_request_updated",
    entityType: "referral_request",
    entityId: values.requestId,
    visibility: "private",
    category: "referrals",
    recipientIds: [recipientId],
    title: "Referral request updated",
    body: `The referral request for ${row.title} at ${row.company} is now ${row.state.replace("_", " ")}.`,
    actionUrl: `/app/groups/${row.groupSlug}/referrals`,
    dedupeKey: `referral-updated:${values.requestId}:${row.state}`,
    summary: "A referral request was updated.",
  });
}

export async function createInviteAcceptedEvent(
  execute: NotificationSqlExecutor,
  input: { groupId: string; memberId: string },
) {
  const values = z
    .object({ groupId: idSchema, memberId: idSchema })
    .parse(input);
  const result = await execute<{
    groupSlug: string;
    memberName: string;
    recipientIds: string[];
  }>(sql`
    select
      group_record.slug as "groupSlug",
      member.name as "memberName",
      coalesce(
        array_agg(manager.user_id) filter (
          where manager.user_id is not null
            and manager.user_id <> ${values.memberId}
        ),
        '{}'::uuid[]
      ) as "recipientIds"
    from groups group_record
    inner join users member on member.id = ${values.memberId}
    inner join group_memberships joined_member
      on joined_member.group_id = group_record.id
      and joined_member.user_id = member.id
      and joined_member.status = 'active'
    left join group_memberships manager
      on manager.group_id = group_record.id
      and manager.status = 'active'
      and manager.role in ('owner', 'admin')
    where group_record.id = ${values.groupId}
    group by group_record.id, member.id
  `);
  const row = result.rows[0];
  if (!row) return null;

  return emitActivityEvent(execute, {
    groupId: values.groupId,
    actorUserId: values.memberId,
    recipientUserId: null,
    eventType: "invite_accepted",
    entityType: "group_membership",
    entityId: null,
    visibility: "group",
    category: "group_activity",
    recipientIds: row.recipientIds,
    title: "Invite accepted",
    body: `${row.memberName} joined the group.`,
    actionUrl: `/app/groups/${row.groupSlug}/people`,
    dedupeKey: `invite-accepted:${values.groupId}:${values.memberId}`,
    summary: `${row.memberName} joined the group.`,
  });
}

export async function createOutcomeSharedEvent(
  execute: NotificationSqlExecutor,
  outcomeId: string,
) {
  const validOutcomeId = idSchema.parse(outcomeId);
  const result = await execute<{
    groupId: string;
    groupSlug: string;
    sharedByUserId: string;
    outcomeType: string;
    recipientIds: string[];
  }>(sql`
    select
      outcome.group_id as "groupId",
      group_record.slug as "groupSlug",
      outcome.shared_by_user_id as "sharedByUserId",
      outcome.outcome_type as "outcomeType",
      array_agg(membership.user_id) filter (
        where membership.user_id <> outcome.shared_by_user_id
      ) as "recipientIds"
    from outcomes outcome
    inner join groups group_record on group_record.id = outcome.group_id
    inner join group_memberships membership
      on membership.group_id = outcome.group_id
      and membership.status = 'active'
    where outcome.id = ${validOutcomeId}
      and outcome.visibility = 'group'
      and outcome.consent_granted_at is not null
      and outcome.shared_at is not null
    group by outcome.id, group_record.id
  `);
  const row = result.rows[0];
  if (!row) return null;
  const outcomeLabel = row.outcomeType.replace("_", " ");

  return emitActivityEvent(execute, {
    groupId: row.groupId,
    actorUserId: row.sharedByUserId,
    recipientUserId: null,
    eventType: "outcome_shared",
    entityType: "outcome",
    entityId: validOutcomeId,
    visibility: "group",
    category: "group_activity",
    recipientIds: row.recipientIds ?? [],
    title: "Outcome shared",
    body: `A member shared a ${outcomeLabel} outcome with the group.`,
    actionUrl: `/app/groups/${row.groupSlug}`,
    dedupeKey: `outcome-shared:${validOutcomeId}`,
    summary: `A ${outcomeLabel} outcome was shared with consent.`,
  });
}

export async function createDueFollowUpNotifications(
  execute: NotificationSqlExecutor,
  userId: string,
  now = new Date(),
) {
  const validUserId = idSchema.parse(userId);
  const result = await execute<{
    applicationId: string;
    groupId: string;
    groupSlug: string;
    jobId: string;
    title: string;
    company: string;
    nextActionDate: string;
  }>(sql`
    select
      application.id as "applicationId",
      application.source_group_id as "groupId",
      group_record.slug as "groupSlug",
      application.job_id as "jobId",
      job.title,
      job.company,
      application.next_action_date::text as "nextActionDate"
    from applications application
    inner join groups group_record on group_record.id = application.source_group_id
    inner join jobs job on job.id = application.job_id
    inner join group_memberships membership
      on membership.group_id = application.source_group_id
      and membership.user_id = application.user_id
      and membership.status = 'active'
    where application.user_id = ${validUserId}
      and application.archived_at is null
      and application.next_action_date is not null
      and application.next_action_date <= ${now}::date
      and application.status in ('saved', 'applied', 'interviewing', 'offer')
  `);
  let created = 0;

  for (const row of result.rows) {
    const routed = await emitActivityEvent(execute, {
      groupId: row.groupId,
      actorUserId: validUserId,
      recipientUserId: validUserId,
      eventType: "application_follow_up_reminder",
      entityType: "application",
      entityId: row.applicationId,
      visibility: "private",
      category: "application_reminders",
      recipientIds: [validUserId],
      title: "Application follow-up due",
      body: `Your planned follow-up for ${row.title} at ${row.company} is due.`,
      actionUrl: `/app/groups/${row.groupSlug}/tracker`,
      dedupeKey: `application-follow-up:${row.applicationId}:${row.nextActionDate}`,
      summary: "A private application follow-up became due.",
    });
    created += routed?.notificationCount ?? 0;
  }

  return created;
}

export async function createClosingSoonNotifications(
  execute: NotificationSqlExecutor,
  userId: string,
  now = new Date(),
) {
  const validUserId = idSchema.parse(userId);
  const result = await execute<{
    groupId: string;
    groupSlug: string;
    jobId: string;
    title: string;
    company: string;
  }>(sql`
    select distinct
      share.group_id as "groupId",
      group_record.slug as "groupSlug",
      job.id as "jobId",
      job.title,
      job.company
    from user_job_states viewer_state
    inner join jobs job on job.id = viewer_state.job_id
    inner join active_job_shares share on share.job_id = job.id
    inner join groups group_record on group_record.id = share.group_id
    inner join group_memberships membership
      on membership.group_id = share.group_id
      and membership.user_id = viewer_state.user_id
      and membership.status = 'active'
    where viewer_state.user_id = ${validUserId}
      and viewer_state.saved = true
      and viewer_state.dismissed = false
      and job.status = 'active'
      and (
        (
          job.expires_at is not null
          and job.expires_at between ${now}::timestamptz
            and (${now}::timestamptz + interval '7 days')
        )
        or (
          job.expires_at is null
          and job.posted_at is not null
          and job.posted_at between (${now}::timestamptz - interval '35 days')
            and (${now}::timestamptz - interval '21 days')
        )
      )
  `);
  let created = 0;

  for (const row of result.rows) {
    const routed = await emitActivityEvent(execute, {
      groupId: row.groupId,
      actorUserId: null,
      recipientUserId: validUserId,
      eventType: "job_likely_closing_soon",
      entityType: "job",
      entityId: row.jobId,
      visibility: "private",
      category: "job_activity",
      recipientIds: [validUserId],
      title: "Saved job may close soon",
      body: `${row.title} at ${row.company} may be closing soon.`,
      actionUrl: `/app/groups/${row.groupSlug}/jobs/${row.jobId}`,
      dedupeKey: `job-closing-soon:${row.groupId}:${row.jobId}:${validUserId}`,
      summary: "A saved job may be closing soon.",
    });
    created += routed?.notificationCount ?? 0;
  }

  return created;
}

export function parseDigestCadence(value: unknown) {
  return digestCadenceSchema.parse(value);
}
