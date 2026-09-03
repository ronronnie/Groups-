import { notFound } from "next/navigation";
import { JobDetail } from "@/features/jobs/components/job-detail";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createGroupSqlExecutor } from "@/server/groups/database";
import { getMemberGroupBySlug } from "@/server/groups/service";
import { createJobSqlExecutor } from "@/server/jobs/database";
import { getGroupJobDetail } from "@/server/jobs/detail-service";
import { listJobDiscussion } from "@/server/jobs/discussion-service";
import { createReferralSqlExecutor } from "@/server/referrals/database";
import { listPotentialReferrers } from "@/server/referrals/service";

export default async function GroupJobDetailPage({
  params,
}: {
  params: Promise<{ groupSlug: string; jobId: string }>;
}) {
  const { groupSlug, jobId } = await params;
  const user = await requireCurrentUser(
    `/app/groups/${groupSlug}/jobs/${jobId}`,
  );
  const group = await getMemberGroupBySlug(
    createGroupSqlExecutor(),
    groupSlug,
    user.id,
  );

  if (!group) notFound();

  const execute = createJobSqlExecutor();
  const [detail, messages, potentialReferrers] = await Promise.all([
    getGroupJobDetail(execute, {
      groupId: group.id,
      jobId,
      viewerId: user.id,
    }),
    listJobDiscussion(execute, {
      groupId: group.id,
      jobId,
      viewerId: user.id,
    }),
    listPotentialReferrers(createReferralSqlExecutor(), {
      groupId: group.id,
      jobId,
      viewerId: user.id,
    }),
  ]);

  if (!detail || !messages || !potentialReferrers) notFound();

  return (
    <JobDetail
      detail={detail}
      groupId={group.id}
      groupSlug={group.slug}
      messages={messages}
      potentialReferrers={potentialReferrers}
    />
  );
}
