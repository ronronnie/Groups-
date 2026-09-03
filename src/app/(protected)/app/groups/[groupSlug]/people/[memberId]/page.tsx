import { notFound } from "next/navigation";
import { MemberProfile } from "@/features/people/components/member-profile";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createGroupSqlExecutor } from "@/server/groups/database";
import { getMemberGroupBySlug } from "@/server/groups/service";
import { createPeopleSqlExecutor } from "@/server/people/database";
import { getGroupMemberOverview } from "@/server/people/service";
import { createProfileSqlExecutor } from "@/server/profiles/database";
import { getVisibleCareerProfile } from "@/server/profiles/service";

export default async function GroupMemberPage({
  params,
}: {
  params: Promise<{ groupSlug: string; memberId: string }>;
}) {
  const { groupSlug, memberId } = await params;
  const user = await requireCurrentUser(
    `/app/groups/${groupSlug}/people/${memberId}`,
  );
  const group = await getMemberGroupBySlug(
    createGroupSqlExecutor(),
    groupSlug,
    user.id,
  );

  if (!group) notFound();

  const [overview, profile] = await Promise.all([
    getGroupMemberOverview(createPeopleSqlExecutor(), {
      groupId: group.id,
      viewerId: user.id,
      memberId,
    }),
    getVisibleCareerProfile(createProfileSqlExecutor(), {
      viewerUserId: user.id,
      subjectUserId: memberId,
      groupId: group.id,
    }),
  ]);

  if (!overview) notFound();

  return (
    <MemberProfile
      contributions={overview.contributions}
      groupSlug={group.slug}
      member={overview.member}
      profile={profile}
    />
  );
}
