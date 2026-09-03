import { notFound } from "next/navigation";
import {
  applicationTrackerFilterSchema,
  applicationTrackerViewSchema,
} from "@/domains/applications/tracker";
import { getGroupEngine } from "@/domains/groups/registry";
import { peopleDirectoryFilterSchema } from "@/domains/reputation/policy";
import { ApplicationTracker } from "@/features/applications/components/application-tracker";
import { ForYouFeed } from "@/features/jobs/components/for-you-feed";
import { JobsTab } from "@/features/jobs/components/jobs-tab";
import { PeopleDirectory } from "@/features/people/components/people-directory";
import { createApplicationSqlExecutor } from "@/server/applications/database";
import { listApplicationTracker } from "@/server/applications/service";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createGroupSqlExecutor } from "@/server/groups/database";
import { getMemberGroupBySlug } from "@/server/groups/service";
import { createJobSqlExecutor } from "@/server/jobs/database";
import { feedFilterSchema, getForYouFeed } from "@/server/jobs/feed-service";
import { listGroupJobs } from "@/server/jobs/service";
import { createPeopleSqlExecutor } from "@/server/people/database";
import { listGroupPeople } from "@/server/people/service";

export default async function GroupTabPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupSlug: string; tab: string }>;
  searchParams: Promise<{
    status?: string | string[];
    view?: string | string[];
    filter?: string | string[];
    q?: string | string[];
  }>;
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

  if (tab === "tracker") {
    const user = await requireCurrentUser(`/app/groups/${groupSlug}/tracker`);
    const group = await getMemberGroupBySlug(
      createGroupSqlExecutor(),
      groupSlug,
      user.id,
    );

    if (!group) notFound();

    const query = await searchParams;
    const parsedFilter = applicationTrackerFilterSchema.safeParse(
      Array.isArray(query.status) ? query.status[0] : query.status,
    );
    const parsedView = applicationTrackerViewSchema.safeParse(
      Array.isArray(query.view) ? query.view[0] : query.view,
    );
    const filter = parsedFilter.success ? parsedFilter.data : "all";
    const view = parsedView.success ? parsedView.data : "board";
    const applications = await listApplicationTracker(
      createApplicationSqlExecutor(),
      { groupId: group.id, userId: user.id, filter },
    );

    if (!applications) notFound();

    return (
      <ApplicationTracker
        applications={applications}
        filter={filter}
        groupId={group.id}
        groupSlug={group.slug}
        view={view}
      />
    );
  }

  if (tab === "people") {
    const user = await requireCurrentUser(`/app/groups/${groupSlug}/people`);
    const group = await getMemberGroupBySlug(
      createGroupSqlExecutor(),
      groupSlug,
      user.id,
    );

    if (!group) notFound();

    const query = await searchParams;
    const rawFilter = Array.isArray(query.filter)
      ? query.filter[0]
      : query.filter;
    const rawSearch = Array.isArray(query.q) ? query.q[0] : query.q;
    const parsedFilter = peopleDirectoryFilterSchema.safeParse(rawFilter);
    const filter = parsedFilter.success ? parsedFilter.data : "all";
    const memberQuery = rawSearch?.trim().slice(0, 100) ?? "";
    const members = await listGroupPeople(createPeopleSqlExecutor(), {
      groupId: group.id,
      viewerId: user.id,
      filter,
      query: memberQuery,
    });

    if (!members) notFound();

    return (
      <PeopleDirectory
        filter={filter}
        groupSlug={group.slug}
        members={members}
        query={memberQuery}
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
