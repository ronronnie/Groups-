import { sql, type SQL } from "drizzle-orm";
import { groupProfileDetailsAllowedSql } from "@/server/groups/privacy";
import { z } from "zod";
import { visibleReputationEventSql } from "@/server/reputation/service";
import {
  emptyReputationSummary,
  getContributionBadges,
  peopleDirectoryFilterSchema,
  reputationEventPolicy,
  type PeopleDirectoryFilter,
  type ReputationEventType,
  type ReputationSummary,
} from "@/domains/reputation/policy";

export type PeopleSqlExecutor = <Row extends Record<string, unknown>>(
  query: SQL,
) => Promise<{ rows: Row[] }>;

export type GroupMemberDirectoryItem = ReputationSummary & {
  userId: string;
  displayName: string;
  membershipRole: "owner" | "admin" | "member";
  joinedAt: Date;
  profileVisible: boolean;
  headline: string | null;
  currentRole: string | null;
  currentCompany: string | null;
  location: string | null;
  skills: string[];
  badges: ReputationEventType[];
};

export type MemberContributionHighlight = {
  eventType: ReputationEventType;
  label: string;
  count: number;
  points: number;
};

type GroupMemberRow = Omit<GroupMemberDirectoryItem, "joinedAt" | "badges"> & {
  joinedAt: Date | string;
};

const directoryInputSchema = z.object({
  groupId: z.string().uuid(),
  viewerId: z.string().uuid(),
  query: z.string().trim().max(100).default(""),
  filter: peopleDirectoryFilterSchema.default("all"),
});

const memberInputSchema = z.object({
  groupId: z.string().uuid(),
  viewerId: z.string().uuid(),
  memberId: z.string().uuid(),
});

function mapMember(row: GroupMemberRow): GroupMemberDirectoryItem {
  const summary: ReputationSummary = {
    totalPoints: Number(row.totalPoints),
    jobsShared: Number(row.jobsShared),
    jobsSavedByMembers: Number(row.jobsSavedByMembers),
    applicationsAttributed: Number(row.applicationsAttributed),
    referralsCompleted: Number(row.referralsCompleted),
    interviewsHelped: Number(row.interviewsHelped),
    hiresHelped: Number(row.hiresHelped),
  };

  return {
    ...row,
    ...summary,
    joinedAt:
      row.joinedAt instanceof Date ? row.joinedAt : new Date(row.joinedAt),
    skills: row.skills ?? [],
    badges: getContributionBadges(summary),
  };
}

const memberSelection = sql`
  membership.user_id as "userId",
  case
    when profile.user_id is not null and (
      profile.user_id = viewer.user_id
      or (profile.visibility in ('groups', 'public') and ${groupProfileDetailsAllowedSql(sql`membership.group_id`)})
    ) then profile.display_name
    else member.name
  end as "displayName",
  membership.role as "membershipRole",
  membership.joined_at as "joinedAt",
  profile.user_id is not null and (
    profile.user_id = viewer.user_id
    or (profile.visibility in ('groups', 'public') and ${groupProfileDetailsAllowedSql(sql`membership.group_id`)})
  ) as "profileVisible",
  case
    when profile.user_id = viewer.user_id
      or (profile.visibility in ('groups', 'public') and ${groupProfileDetailsAllowedSql(sql`membership.group_id`)})
      then nullif(profile.headline, '')
    else null
  end as headline,
  case
    when profile.user_id = viewer.user_id
      or (profile.visibility in ('groups', 'public') and ${groupProfileDetailsAllowedSql(sql`membership.group_id`)})
      then nullif(profile.current_role, '')
    else null
  end as "currentRole",
  case
    when profile.user_id = viewer.user_id
      or (
        (profile.visibility in ('groups', 'public') and ${groupProfileDetailsAllowedSql(sql`membership.group_id`)})
        and coalesce(
          (profile.privacy_settings ->> 'showCurrentCompany')::boolean,
          false
        )
      ) then profile.current_company
    else null
  end as "currentCompany",
  case
    when profile.user_id = viewer.user_id
      or (
        (profile.visibility in ('groups', 'public') and ${groupProfileDetailsAllowedSql(sql`membership.group_id`)})
        and coalesce(
          (profile.privacy_settings ->> 'showLocation')::boolean,
          false
        )
      ) then nullif(profile.location, '')
    else null
  end as location,
  case
    when profile.user_id = viewer.user_id
      or (
        (profile.visibility in ('groups', 'public') and ${groupProfileDetailsAllowedSql(sql`membership.group_id`)})
        and coalesce(
          (profile.privacy_settings ->> 'showSkills')::boolean,
          false
        )
      ) then coalesce(profile.skills, '[]'::jsonb)
    else '[]'::jsonb
  end as skills,
  coalesce(summary.total_points, 0)::int as "totalPoints",
  coalesce(summary.jobs_shared, 0)::int as "jobsShared",
  coalesce(summary.jobs_saved_by_members, 0)::int as "jobsSavedByMembers",
  coalesce(summary.applications_attributed, 0)::int as "applicationsAttributed",
  coalesce(summary.referrals_completed, 0)::int as "referralsCompleted",
  coalesce(summary.interviews_helped, 0)::int as "interviewsHelped",
  coalesce(summary.hires_helped, 0)::int as "hiresHelped"
`;

function matchesFilter(
  member: GroupMemberDirectoryItem,
  filter: PeopleDirectoryFilter,
) {
  if (filter === "helpful_sharers") return member.jobsSavedByMembers > 0;
  if (filter === "referral_helpers") return member.referralsCompleted > 0;
  return true;
}

function matchesQuery(member: GroupMemberDirectoryItem, query: string) {
  if (!query) return true;
  const haystack = [
    member.displayName,
    member.headline,
    member.currentRole,
    member.currentCompany,
    member.location,
    ...member.skills,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
  return haystack.includes(query.toLocaleLowerCase());
}

export async function listGroupPeople(
  execute: PeopleSqlExecutor,
  input: {
    groupId: string;
    viewerId: string;
    query?: string;
    filter?: PeopleDirectoryFilter;
  },
): Promise<GroupMemberDirectoryItem[] | null> {
  const values = directoryInputSchema.parse(input);
  const result = await execute<GroupMemberRow>(sql`
    select ${memberSelection}
    from group_memberships membership
    inner join users member on member.id = membership.user_id
    inner join group_memberships viewer
      on viewer.group_id = membership.group_id
      and viewer.user_id = ${values.viewerId}
      and viewer.status = 'active'
    left join profiles profile on profile.user_id = membership.user_id
    left join user_reputation_summaries summary
      on summary.group_id = membership.group_id
      and summary.user_id = membership.user_id
    where membership.group_id = ${values.groupId}
      and membership.status = 'active'
    order by
      coalesce(summary.total_points, 0) desc,
      lower(coalesce(profile.display_name, member.name)),
      membership.user_id
  `);

  if (!result.rows[0]) {
    const access = await execute<{ allowed: boolean }>(sql`
      select true as allowed
      from group_memberships
      where group_id = ${values.groupId}
        and user_id = ${values.viewerId}
        and status = 'active'
      limit 1
    `);
    if (!access.rows[0]) return null;
  }

  return result.rows
    .map(mapMember)
    .filter((member) => matchesFilter(member, values.filter))
    .filter((member) => matchesQuery(member, values.query));
}

export async function getGroupMemberOverview(
  execute: PeopleSqlExecutor,
  input: { groupId: string; viewerId: string; memberId: string },
): Promise<{
  member: GroupMemberDirectoryItem;
  contributions: MemberContributionHighlight[];
} | null> {
  const values = memberInputSchema.parse(input);
  const memberResult = await execute<GroupMemberRow>(sql`
    select ${memberSelection}
    from group_memberships membership
    inner join users member on member.id = membership.user_id
    inner join group_memberships viewer
      on viewer.group_id = membership.group_id
      and viewer.user_id = ${values.viewerId}
      and viewer.status = 'active'
    left join profiles profile on profile.user_id = membership.user_id
    left join user_reputation_summaries summary
      on summary.group_id = membership.group_id
      and summary.user_id = membership.user_id
    where membership.group_id = ${values.groupId}
      and membership.user_id = ${values.memberId}
      and membership.status = 'active'
    limit 1
  `);
  const row = memberResult.rows[0];
  if (!row) return null;

  const contributionResult = await execute<{
    eventType: ReputationEventType;
    count: number;
    points: number;
  }>(sql`
    select
      event_type as "eventType",
      count(*)::int as count,
      sum(points)::int as points
    from reputation_events event
    where group_id = ${values.groupId}
      and recipient_user_id = ${values.memberId}
      and ${visibleReputationEventSql}
    group by event_type
    order by sum(points) desc, event_type
  `);

  return {
    member: mapMember(row),
    contributions: contributionResult.rows.map((contribution) => ({
      ...contribution,
      count: Number(contribution.count),
      points: Number(contribution.points),
      label: reputationEventPolicy[contribution.eventType].label,
    })),
  };
}

export function createEmptyMemberSummary(): ReputationSummary {
  return { ...emptyReputationSummary };
}
