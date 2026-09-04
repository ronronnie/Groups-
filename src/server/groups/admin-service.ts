import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import {
  groupSettingsSchema,
  updateGroupSettingsSchema,
  roleChangeSchema,
  moderateContentSchema,
  reportContentSchema,
  type GroupSettings,
} from "@/domains/groups/admin";
import type { GroupSqlExecutor } from "@/server/groups/service";

const identitySchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
});

function authorizedGroup(groupId: string, userId: string, ownerOnly = false) {
  return sql`select g.id from groups g inner join group_memberships actor
    on actor.group_id = g.id and actor.user_id = ${userId} and actor.status = 'active'
    where g.id = ${groupId} and actor.role in ('owner', 'admin')
      and (${!ownerOnly} or actor.role = 'owner' and g.owner_id = ${userId})
    for update of g, actor`;
}

function audit(
  groupId: string,
  actorId: string,
  action: string,
  reason: string,
) {
  return sql`insert into group_admin_events (group_id, actor_id, action, target_id, reason)
    select ${groupId}, ${actorId}, ${action}, id, ${reason} from changed returning id`;
}

export type AdminGroup = {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin";
  settings: GroupSettings;
};
export async function getAdminGroup(
  execute: GroupSqlExecutor,
  input: { groupId: string; userId: string },
): Promise<AdminGroup | null> {
  const v = identitySchema.parse(input);
  const result =
    await execute<AdminGroup>(sql`select g.id, g.name, g.slug, actor.role, g.settings
    from groups g inner join group_memberships actor on actor.group_id = g.id
    where g.id = ${v.groupId} and actor.user_id = ${v.userId}
      and actor.status = 'active' and actor.role in ('owner', 'admin')`);
  const row = result.rows[0];
  return row
    ? { ...row, settings: groupSettingsSchema.parse(row.settings) }
    : null;
}

export async function updateGroupSettings(
  execute: GroupSqlExecutor,
  input: z.infer<typeof updateGroupSettingsSchema>,
  userId: string,
) {
  const v = updateGroupSettingsSchema.parse(input);
  z.string().uuid().parse(userId);
  const result = await execute<{
    id: string;
  }>(sql`with authorized as materialized (${authorizedGroup(v.groupId, userId)}),
    changed as (update groups set name = ${v.name}, settings = ${JSON.stringify(v.settings)}::jsonb, updated_at = now()
      where id in (select id from authorized) returning id),
    cleared_index as (delete from group_knowledge_documents where group_id in (select id from changed)),
    audited as (${audit(v.groupId, userId, "settings_updated", "Updated group settings")})
    select id from changed`);
  return result.rows[0] ?? null;
}

export type ManagedMember = {
  userId: string;
  name: string;
  role: "owner" | "admin" | "member";
  status: "active" | "removed" | "left";
};
export async function listManagedMembers(
  execute: GroupSqlExecutor,
  input: { groupId: string; userId: string },
) {
  const v = identitySchema.parse(input);
  const result =
    await execute<ManagedMember>(sql`select member.user_id as "userId", u.name, member.role, member.status
    from group_memberships member inner join users u on u.id = member.user_id
    where member.group_id = ${v.groupId} and exists (
      select 1 from group_memberships actor where actor.group_id = member.group_id and actor.user_id = ${v.userId}
        and actor.status = 'active' and actor.role in ('owner', 'admin'))
    order by (member.role = 'owner') desc, (member.status = 'active') desc, lower(u.name), member.user_id`);
  return result.rows;
}

export async function changeMemberRole(
  execute: GroupSqlExecutor,
  input: z.infer<typeof roleChangeSchema> & { userId: string },
) {
  const v = roleChangeSchema.extend({ userId: z.string().uuid() }).parse(input);
  const result = await execute<{
    id: string;
  }>(sql`with authorized as materialized (${authorizedGroup(v.groupId, v.userId, true)}),
    changed as (update group_memberships target set role = ${v.role}, updated_at = now()
      where target.group_id in (select id from authorized) and target.user_id = ${v.memberId}
        and target.user_id <> ${v.userId} and target.role <> 'owner' and target.status = 'active'
        and target.user_id <> (select owner_id from groups where id = ${v.groupId})
        and target.role <> ${v.role} returning target.user_id as id),
    audited as (${audit(v.groupId, v.userId, "role_changed", `Role changed to ${v.role}`)})
    select id from changed`);
  return result.rows[0] ?? null;
}

export async function removeGroupMember(
  execute: GroupSqlExecutor,
  input: { groupId: string; userId: string; memberId: string },
) {
  const v = identitySchema.extend({ memberId: z.string().uuid() }).parse(input);
  const result = await execute<{
    id: string;
  }>(sql`with authorized as materialized (${authorizedGroup(v.groupId, v.userId)}),
    changed as (update group_memberships target set status = 'removed', ended_at = now(), updated_at = now()
      where target.group_id in (select id from authorized) and target.user_id = ${v.memberId}
        and target.user_id <> ${v.userId} and target.role <> 'owner' and target.status = 'active'
        and target.user_id <> (select owner_id from groups where id = ${v.groupId})
        and (target.role = 'member' or exists (select 1 from group_memberships actor
          where actor.group_id = target.group_id and actor.user_id = ${v.userId} and actor.role = 'owner'))
      returning target.user_id as id),
    revoked as (update group_invites set revoked_at = now()
      where group_id = ${v.groupId} and inviter_id in (select id from changed) and revoked_at is null),
    cleared_index as (delete from group_knowledge_documents where group_id = ${v.groupId}
      and source_kind in ('profile', 'reputation') and source_id in (select id from changed)),
    audited as (${audit(v.groupId, v.userId, "member_removed", "Removed group membership and revoked issued invites")})
    select id from changed`);
  return result.rows[0] ?? null;
}

function targetQuery(
  targetType: "job_share" | "message",
  groupId: string,
  targetId: string,
  activeOnly: boolean,
): SQL {
  if (targetType === "job_share")
    return sql`select id from job_shares where group_id = ${groupId} and id = ${targetId}
    and (${!activeOnly} or archived_at is null)`;
  return sql`select message.id from messages message inner join message_threads thread on thread.id = message.thread_id
    and thread.group_id = message.group_id where message.group_id = ${groupId} and message.id = ${targetId}
      and thread.kind = 'general' and (${!activeOnly} or message.deleted_at is null)`;
}

export async function reportGroupContent(
  execute: GroupSqlExecutor,
  input: z.infer<typeof reportContentSchema> & { userId: string },
) {
  const v = reportContentSchema
    .extend({ userId: z.string().uuid() })
    .parse(input);
  const result = await execute<{
    id: string;
  }>(sql`insert into group_content_reports
    (group_id, reporter_id, target_type, target_id, reason, details)
    select ${v.groupId}, ${v.userId}, ${v.targetType}, target.id, ${v.reason}, ${v.details}
    from (${targetQuery(v.targetType, v.groupId, v.targetId, true)}) target
    where exists (select 1 from group_memberships where group_id = ${v.groupId}
      and user_id = ${v.userId} and status = 'active')
    on conflict (group_id, reporter_id, target_type, target_id) do update set target_id = excluded.target_id returning id`);
  return result.rows[0] ?? null;
}

export async function moderateGroupContent(
  execute: GroupSqlExecutor,
  input: z.infer<typeof moderateContentSchema> & { userId: string },
) {
  const v = moderateContentSchema
    .extend({ userId: z.string().uuid() })
    .parse(input);
  const table = v.targetType === "job_share" ? sql`job_shares` : sql`messages`;
  const column =
    v.targetType === "job_share" ? sql`archived_at` : sql`deleted_at`;
  const action =
    v.targetType === "job_share"
      ? v.hidden
        ? "share_archived"
        : "share_restored"
      : v.hidden
        ? "message_hidden"
        : "message_restored";
  const result = await execute<{
    id: string;
  }>(sql`with authorized as materialized (${authorizedGroup(v.groupId, v.userId)}),
    changed as (update ${table} set ${column} = ${v.hidden ? sql`now()` : sql`null`}
      where group_id in (select id from authorized)
        and id in (${targetQuery(v.targetType, v.groupId, v.targetId, false)})
        and (${column} is null) = ${v.hidden} returning id),
    reviewed as (update group_content_reports set status = 'actioned', reviewed_by = ${v.userId}, reviewed_at = now()
      where group_id = ${v.groupId} and target_type = ${v.targetType} and target_id in (select id from changed)
        and status = 'open' and ${v.hidden}),
    cleared_index as (delete from group_knowledge_documents where group_id = ${v.groupId} and exists (select 1 from changed)),
    audited as (${audit(v.groupId, v.userId, action, v.reason)})
    select id from changed`);
  return result.rows[0] ?? null;
}

export async function dismissContentReport(
  execute: GroupSqlExecutor,
  input: { groupId: string; userId: string; reportId: string },
) {
  const v = identitySchema.extend({ reportId: z.string().uuid() }).parse(input);
  const result = await execute<{
    id: string;
  }>(sql`with authorized as materialized (${authorizedGroup(v.groupId, v.userId)}),
    changed as (update group_content_reports set status = 'dismissed', reviewed_by = ${v.userId}, reviewed_at = now()
      where id = ${v.reportId} and group_id in (select id from authorized) and status = 'open' returning id),
    audited as (${audit(v.groupId, v.userId, "report_dismissed", "Reviewed and dismissed report")}) select id from changed`);
  return result.rows[0] ?? null;
}

export type ModerationContent = {
  id: string;
  targetType: "job_share" | "message";
  title: string;
  body: string;
  authorName: string;
  hidden: boolean;
  reports: number;
};
export type ContentReport = {
  id: string;
  targetId: string;
  targetType: "job_share" | "message";
  reason: string;
  details: string;
  reporterName: string;
};
export async function getModerationQueue(
  execute: GroupSqlExecutor,
  input: { groupId: string; userId: string },
) {
  const v = identitySchema.parse(input);
  const allowed = sql`exists (select 1 from group_memberships where group_id = ${v.groupId} and user_id = ${v.userId}
    and status = 'active' and role in ('owner', 'admin'))`;
  const content = await execute<ModerationContent>(sql`with content as (
    select share.id, 'job_share'::text as "targetType", job.title || ' at ' || job.company as title,
      coalesce(share.note, '') as body, u.name as "authorName", share.archived_at is not null as hidden, share.shared_at as created
    from job_shares share inner join jobs job on job.id = share.job_id inner join users u on u.id = share.sharer_id
    where share.group_id = ${v.groupId} and ${allowed}
    union all
    select message.id, 'message', 'General chat', message.body, coalesce(u.name, 'Former member'),
      message.deleted_at is not null, message.created_at from messages message
    inner join message_threads thread on thread.id = message.thread_id and thread.group_id = message.group_id
    left join users u on u.id = message.author_id
    where message.group_id = ${v.groupId} and thread.kind = 'general' and ${allowed}
  ) select id, "targetType", title, body, "authorName", hidden,
    (select count(*)::int from group_content_reports report where report.group_id = ${v.groupId}
      and report.target_type = content."targetType" and report.target_id = content.id and report.status = 'open') as reports
    from content order by reports desc, created desc, id limit 100`);
  const reports =
    await execute<ContentReport>(sql`select report.id, report.target_id as "targetId", report.target_type as "targetType",
    report.reason, report.details, u.name as "reporterName" from group_content_reports report
    inner join users u on u.id = report.reporter_id where report.group_id = ${v.groupId} and report.status = 'open' and ${allowed}
    order by report.created_at, report.id limit 200`);
  return { content: content.rows, reports: reports.rows };
}
