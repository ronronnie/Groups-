import { notFound } from "next/navigation";
import { GroupDigest } from "@/features/notifications/components/group-digest";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getRecipientGroupDigest } from "@/server/digests/service";
import { createGroupSqlExecutor } from "@/server/groups/database";
import { getMemberGroupBySlug } from "@/server/groups/service";

export default async function GroupDigestPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupSlug: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const [{ groupSlug }, query] = await Promise.all([params, searchParams]);
  const user = await requireCurrentUser(`/app/groups/${groupSlug}/digest`);
  const execute = createGroupSqlExecutor();
  const group = await getMemberGroupBySlug(execute, groupSlug, user.id);
  if (!group) notFound();

  const cadence = query.period === "daily" ? "daily" : "weekly";
  const digest = await getRecipientGroupDigest(execute, {
    groupId: group.id,
    userId: user.id,
    cadence,
  });
  if (!digest) notFound();

  return <GroupDigest digest={digest} />;
}
