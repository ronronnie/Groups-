import { notFound } from "next/navigation";
import { getGroupEngine } from "@/domains/groups/registry";
import { ForYouFeed } from "@/features/jobs/components/for-you-feed";
import { JobsTab } from "@/features/jobs/components/jobs-tab";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createGroupSqlExecutor } from "@/server/groups/database";
import { getMemberGroupBySlug } from "@/server/groups/service";
import { createJobSqlExecutor } from "@/server/jobs/database";
import { feedFilterSchema, getForYouFeed } from "@/server/jobs/feed-service";
import { listGroupJobs } from "@/server/jobs/service";

export default async function GroupTabPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupSlug: string; tab: string }>;
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const { groupSlug, tab } = await params;
  const engine = getGroupEngine("jobs");
  const navigationTab = engine?.navigation.find(
    (item) => item.hrefSegment === tab,
  );
  const emptyState = engine?.emptyStates.find((item) => item.id === tab);

  if (!engine || !navigationTab || !emptyState) {
    notFound();
  }

  if (tab === "jobs") {
    const user = await requireCurrentUser(`/app/groups/${groupSlug}/jobs`);
    const group = await getMemberGroupBySlug(
      createGroupSqlExecutor(),
      groupSlug,
      user.id,
    );

    if (!group) notFound();

    const jobs = await listGroupJobs(createJobSqlExecutor(), {
      groupId: group.id,
      viewerId: user.id,
    });

    if (!jobs) notFound();

    return <JobsTab groupId={group.id} groupSlug={group.slug} jobs={jobs} />;
  }

  if (tab === "for-you") {
    const user = await requireCurrentUser(`/app/groups/${groupSlug}/for-you`);
    const group = await getMemberGroupBySlug(
      createGroupSqlExecutor(),
      groupSlug,
      user.id,
    );

    if (!group) notFound();

    const query = await searchParams;
    const parsedFilter = feedFilterSchema.safeParse(query.view);
    const filter = parsedFilter.success ? parsedFilter.data : "recommended";
    const feed = await getForYouFeed(createJobSqlExecutor(), {
      groupId: group.id,
      viewerId: user.id,
      filter,
    });

    if (!feed) notFound();

    return (
      <ForYouFeed
        filter={filter}
        groupId={group.id}
        groupSlug={group.slug}
        items={feed.items}
        profileCompleteness={feed.profileCompleteness}
      />
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="space-y-2">
        <h2 className="text-4xl font-bold">{navigationTab.label}</h2>
      </div>
      <section className="mt-10 border-t pt-8">
        <h3 className="text-2xl font-bold">{emptyState.title}</h3>
        <p className="mt-2 max-w-xl font-secondary leading-7 text-muted-foreground">
          {emptyState.description}
        </p>
      </section>
    </div>
  );
}
