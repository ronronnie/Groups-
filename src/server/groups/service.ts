import { sql, type SQL } from "drizzle-orm";
import {
  createGroupInputSchema,
  createInviteInputSchema,
  inviteTokenSchema,
  type CreateGroupInput,
  type CreateInviteInput,
} from "@/domains/groups/validation";
import {
  generateInviteToken,
  hashInviteToken,
} from "@/server/groups/invite-token";

export type GroupSqlExecutor = <Row extends Record<string, unknown>>(
  query: SQL,
) => Promise<{ rows: Row[] }>;

export type MemberGroup = {
  id: string;
  name: string;
  slug: string;
  engineKey: "jobs";
  role: "owner" | "admin" | "member";
  memberCount: number;
  allowMemberInvites?: boolean;
  invitesEnabled?: boolean;
};

export type InviteStatus =
  "active" | "expired" | "revoked" | "exhausted" | "paused";

export type InvitePreview = {
  id: string;
  groupId: string;
  groupName: string;
  groupSlug: string;
  memberCount: number;
  expiresAt: Date;
  status: InviteStatus;
};

export type ManagedInvite = {
  id: string;
  expiresAt: Date;
  maxUses: number | null;
  useCount: number;
  status: InviteStatus;
};

type TokenFactory = () => string;

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function normalizeBaseSlug(name: string) {
  const normalized = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return normalized || "group";
}

export function createGroupSlug(name: string, suffix: string) {
  return `${normalizeBaseSlug(name)}-${suffix.toLowerCase()}`;
}

function inviteStatusSql(now: Date) {
  return sql<InviteStatus>`case
    when gi.revoked_at is not null then 'revoked'
    when exists (select 1 from groups paused where paused.id = gi.group_id
      and paused.settings ->> 'invitesEnabled' = 'false') then 'paused'
    when gi.expires_at <= ${now} then 'expired'
    when gi.max_uses is not null and gi.use_count >= gi.max_uses then 'exhausted'
    else 'active'
  end`;
}

export async function createGroupWithInvite(
  execute: GroupSqlExecutor,
  input: CreateGroupInput & { ownerId: string },
  options: {
    now?: Date;
    tokenFactory?: TokenFactory;
    slugSuffix?: string;
  } = {},
) {
  const values = createGroupInputSchema.parse(input);
  const now = options.now ?? new Date();
  const token = (options.tokenFactory ?? generateInviteToken)();
  const tokenHash = hashInviteToken(token);
  const suffix = options.slugSuffix ?? tokenHash.slice(0, 8);
  const slug = createGroupSlug(values.name, suffix);
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1_000);
  const settings = JSON.stringify({
    allowMemberInvites: false,
    defaultProfileVisibility: "members",
  });

  const result = await execute<{
    groupId: string;
    groupName: string;
    groupSlug: string;
    inviteId: string;
    expiresAt: Date | string;
  }>(sql`
    with new_group as (
      insert into groups (name, slug, engine_key, owner_id, settings)
      values (
        ${values.name},
        ${slug},
        ${values.engineKey},
        ${input.ownerId},
        ${settings}::jsonb
      )
      returning id, name, slug
    ),
    owner_membership as (
      insert into group_memberships (group_id, user_id, role, status)
      select id, ${input.ownerId}, 'owner', 'active'
      from new_group
      returning group_id
    ),
    new_invite as (
      insert into group_invites (
        group_id,
        inviter_id,
        token_hash,
        expires_at
      )
      select id, ${input.ownerId}, ${tokenHash}, ${expiresAt}
      from new_group
      returning id, group_id, expires_at
    )
    select
      ng.id as "groupId",
      ng.name as "groupName",
      ng.slug as "groupSlug",
      ni.id as "inviteId",
      ni.expires_at as "expiresAt"
    from new_group ng
    inner join owner_membership om on om.group_id = ng.id
    inner join new_invite ni on ni.group_id = ng.id
  `);
  const row = result.rows[0];

  if (!row) {
    throw new Error("The group could not be created.");
  }

  return { ...row, expiresAt: toDate(row.expiresAt), token };
}

export async function createGroupInvite(
  execute: GroupSqlExecutor,
  input: CreateInviteInput & { inviterId: string },
  tokenFactory: TokenFactory = generateInviteToken,
) {
  const values = createInviteInputSchema.parse(input);
  const token = tokenFactory();
  const tokenHash = hashInviteToken(token);
  const result = await execute<{
    id: string;
    groupId: string;
    groupSlug: string;
    expiresAt: Date | string;
  }>(sql`
    insert into group_invites (
      group_id,
      inviter_id,
      token_hash,
      expires_at,
      max_uses
    )
    select
      g.id,
      ${input.inviterId},
      ${tokenHash},
      ${values.expiresAt},
      ${values.maxUses}
    from groups g
    inner join group_memberships gm
      on gm.group_id = g.id
      and gm.user_id = ${input.inviterId}
      and gm.status = 'active'
      and (gm.role in ('owner', 'admin') or g.settings ->> 'allowMemberInvites' = 'true')
    where g.id = ${values.groupId}
      and coalesce(g.settings ->> 'invitesEnabled', 'true') = 'true'
    returning
      id,
      group_id as "groupId",
      (select slug from groups where id = group_id) as "groupSlug",
      expires_at as "expiresAt"
  `);
  const row = result.rows[0];

  return row ? { ...row, expiresAt: toDate(row.expiresAt), token } : null;
}

export async function getInvitePreview(
  execute: GroupSqlExecutor,
  token: string,
  now = new Date(),
): Promise<InvitePreview | null> {
  const parsedToken = inviteTokenSchema.safeParse(token);
  if (!parsedToken.success) {
    return null;
  }

  const tokenHash = hashInviteToken(parsedToken.data);
  const result = await execute<{
    id: string;
    groupId: string;
    groupName: string;
    groupSlug: string;
    memberCount: number;
    expiresAt: Date | string;
    status: InviteStatus;
  }>(sql`
    select
      gi.id,
      g.id as "groupId",
      g.name as "groupName",
      g.slug as "groupSlug",
      count(gm.id)::int as "memberCount",
      gi.expires_at as "expiresAt",
      ${inviteStatusSql(now)} as status
    from group_invites gi
    inner join groups g on g.id = gi.group_id
    left join group_memberships gm
      on gm.group_id = g.id and gm.status = 'active'
    where gi.token_hash = ${tokenHash}
    group by gi.id, g.id
  `);
  const row = result.rows[0];

  return row ? { ...row, expiresAt: toDate(row.expiresAt) } : null;
}

export async function acceptGroupInvite(
  execute: GroupSqlExecutor,
  input: { token: string; userId: string },
  now = new Date(),
) {
  const parsedToken = inviteTokenSchema.safeParse(input.token);
  if (!parsedToken.success) {
    return null;
  }

  const tokenHash = hashInviteToken(parsedToken.data);
  const result = await execute<{
    groupId: string;
    groupSlug: string;
    alreadyMember: boolean;
  }>(sql`
    with valid_invite as materialized (
      select gi.id, gi.group_id
      from group_invites gi
      inner join groups g on g.id = gi.group_id
      where gi.token_hash = ${tokenHash}
        and coalesce(g.settings ->> 'invitesEnabled', 'true') = 'true'
        and gi.revoked_at is null
        and gi.expires_at > ${now}
        and (gi.max_uses is null or gi.use_count < gi.max_uses)
      for update
    ),
    existing_membership as (
      select gm.group_id
      from group_memberships gm
      inner join valid_invite vi on vi.group_id = gm.group_id
      where gm.user_id = ${input.userId} and gm.status = 'active'
    ),
    membership_change as (
      insert into group_memberships (group_id, user_id, role, status)
      select vi.group_id, ${input.userId}, 'member', 'active'
      from valid_invite vi
      where not exists (select 1 from existing_membership)
      on conflict (group_id, user_id) do update
      set
        status = 'active',
        role = 'member',
        ended_at = null,
        updated_at = ${now}
      where group_memberships.status = 'left'
      returning group_id
    ),
    consumed_invite as (
      update group_invites gi
      set use_count = gi.use_count + 1
      from valid_invite vi
      where gi.id = vi.id
        and exists (
          select 1 from membership_change mc where mc.group_id = vi.group_id
        )
      returning gi.group_id
    )
    select
      g.id as "groupId",
      g.slug as "groupSlug",
      exists (select 1 from existing_membership) as "alreadyMember"
    from valid_invite vi
    inner join groups g on g.id = vi.group_id
    where exists (select 1 from existing_membership)
       or exists (
         select 1 from consumed_invite ci where ci.group_id = vi.group_id
       )
  `);

  return result.rows[0] ?? null;
}

export async function getMemberGroupBySlug(
  execute: GroupSqlExecutor,
  slug: string,
  userId: string,
): Promise<MemberGroup | null> {
  const result = await execute<MemberGroup>(sql`
    select
      g.id,
      g.name,
      g.slug,
      g.engine_key as "engineKey",
      viewer.role,
      coalesce((g.settings ->> 'allowMemberInvites')::boolean, false) as "allowMemberInvites",
      coalesce((g.settings ->> 'invitesEnabled')::boolean, true) as "invitesEnabled",
      count(members.id)::int as "memberCount"
    from groups g
    inner join group_memberships viewer
      on viewer.group_id = g.id
      and viewer.user_id = ${userId}
      and viewer.status = 'active'
    left join group_memberships members
      on members.group_id = g.id and members.status = 'active'
    where g.slug = ${slug}
    group by g.id, viewer.role
  `);

  return result.rows[0] ?? null;
}

export async function listMemberGroups(
  execute: GroupSqlExecutor,
  userId: string,
): Promise<MemberGroup[]> {
  const result = await execute<MemberGroup>(sql`
    select
      g.id,
      g.name,
      g.slug,
      g.engine_key as "engineKey",
      viewer.role,
      count(members.id)::int as "memberCount"
    from groups g
    inner join group_memberships viewer
      on viewer.group_id = g.id
      and viewer.user_id = ${userId}
      and viewer.status = 'active'
    left join group_memberships members
      on members.group_id = g.id and members.status = 'active'
    group by g.id, viewer.role
    order by g.updated_at desc
  `);

  return result.rows;
}

export async function listManagedInvites(
  execute: GroupSqlExecutor,
  groupId: string,
  userId: string,
  now = new Date(),
): Promise<ManagedInvite[] | null> {
  const authorized = await execute<{ allowed: boolean }>(sql`
    select true as allowed
    from group_memberships
    where group_id = ${groupId}
      and user_id = ${userId}
      and status = 'active'
      and (role in ('owner', 'admin') or exists (select 1 from groups g
        where g.id = ${groupId} and g.settings ->> 'allowMemberInvites' = 'true'))
    limit 1
  `);
  if (!authorized.rows[0]) {
    return null;
  }

  const result = await execute<{
    id: string;
    expiresAt: Date | string;
    maxUses: number | null;
    useCount: number;
    status: InviteStatus;
  }>(sql`
    select
      gi.id,
      gi.expires_at as "expiresAt",
      gi.max_uses as "maxUses",
      gi.use_count as "useCount",
      ${inviteStatusSql(now)} as status
    from group_invites gi
    where gi.group_id = ${groupId}
      and exists (
        select 1
        from group_memberships gm
        where gm.group_id = gi.group_id
          and gm.user_id = ${userId}
          and gm.status = 'active'
          and (gm.role in ('owner', 'admin') or (gi.inviter_id = ${userId} and exists (
            select 1 from groups g where g.id = gi.group_id and g.settings ->> 'allowMemberInvites' = 'true')))
      )
    order by gi.created_at desc
  `);

  return result.rows.map((row) => ({
    ...row,
    expiresAt: toDate(row.expiresAt),
  }));
}

export async function revokeGroupInvite(
  execute: GroupSqlExecutor,
  input: { groupId: string; inviteId: string; userId: string },
  now = new Date(),
) {
  const result = await execute<{ id: string }>(sql`
    update group_invites gi
    set revoked_at = ${now}
    where gi.id = ${input.inviteId}
      and gi.group_id = ${input.groupId}
      and gi.revoked_at is null
      and exists (
        select 1
        from group_memberships gm
        where gm.group_id = gi.group_id
          and gm.user_id = ${input.userId}
          and gm.status = 'active'
          and (gm.role in ('owner', 'admin') or gi.inviter_id = ${input.userId})
      )
    returning gi.id
  `);

  return Boolean(result.rows[0]);
}
