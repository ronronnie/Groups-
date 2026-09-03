import { notFound } from "next/navigation";
import { ReferralInbox } from "@/features/referrals/components/referral-inbox";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createGroupSqlExecutor } from "@/server/groups/database";
import { getMemberGroupBySlug } from "@/server/groups/service";
import { createReferralSqlExecutor } from "@/server/referrals/database";
import { listReferralRequests } from "@/server/referrals/service";

export default async function ReferralInboxPage({
  params,
}: {
  params: Promise<{ groupSlug: string }>;
}) {
  const { groupSlug } = await params;
  const user = await requireCurrentUser(`/app/groups/${groupSlug}/referrals`);
  const group = await getMemberGroupBySlug(
    createGroupSqlExecutor(),
    groupSlug,
    user.id,
  );
  if (!group) notFound();

  const requests = await listReferralRequests(createReferralSqlExecutor(), {
    groupId: group.id,
    viewerId: user.id,
  });
  if (!requests) notFound();

  return (
    <ReferralInbox
      groupId={group.id}
      groupSlug={group.slug}
      requests={requests}
      viewerId={user.id}
      viewerRole={group.role}
    />
  );
}
