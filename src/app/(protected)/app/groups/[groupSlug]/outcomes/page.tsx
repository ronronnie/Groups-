import { notFound } from "next/navigation";
import { OutcomesView } from "@/features/outcomes/components/outcomes-view";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createGroupSqlExecutor } from "@/server/groups/database";
import { getMemberGroupBySlug } from "@/server/groups/service";
import { createOutcomeSqlExecutor } from "@/server/outcomes/database";
import { listOutcomes } from "@/server/outcomes/service";

export default async function OutcomesPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupSlug: string }>;
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const { groupSlug } = await params;
  const user = await requireCurrentUser(`/app/groups/${groupSlug}/outcomes`);
  const group = await getMemberGroupBySlug(
    createGroupSqlExecutor(),
    groupSlug,
    user.id,
  );
  if (!group) notFound();
  const scope = (await searchParams).view === "group" ? "group" : "mine";
  const outcomes = await listOutcomes(createOutcomeSqlExecutor(), {
    groupId: group.id,
    userId: user.id,
    scope,
  });
  return (
    <OutcomesView
      outcomes={outcomes}
      scope={scope}
      groupSlug={group.slug}
      userId={user.id}
    />
  );
}
