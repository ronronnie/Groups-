import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getGroupEngine } from "@/domains/groups/registry";
import { JobsTab } from "@/features/jobs/components/jobs-tab";
import { ProfileCompleteness } from "@/features/profiles/components/profile-completeness";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createGroupSqlExecutor } from "@/server/groups/database";
import { getMemberGroupBySlug } from "@/server/groups/service";
import { createJobSqlExecutor } from "@/server/jobs/database";
import { listGroupJobs } from "@/server/jobs/service";
import { createProfileSqlExecutor } from "@/server/profiles/database";
import { getOwnerCareerProfile } from "@/server/profiles/service";

export default async function GroupTabPage({
  params,
}: {
  params: Promise<{ groupSlug: string; tab: string }>;
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

  const profile =
    tab === "for-you"
      ? await requireCurrentUser(`/app/groups/${groupSlug}/for-you`).then(
          (user) => getOwnerCareerProfile(createProfileSqlExecutor(), user.id),
        )
      : null;
  const profileIncomplete = profile ? profile.completeness < 100 : false;

  return (
    <div className="max-w-3xl">
      <div className="space-y-2">
        {tab === "for-you" && profileIncomplete ? (
          <StatusBadge tone="warning">Profile setup needed</StatusBadge>
        ) : null}
        <h2 className="text-4xl font-bold">{navigationTab.label}</h2>
      </div>
      {tab === "for-you" && profileIncomplete ? (
        <section className="mt-8 border-l-4 border-brand bg-surface-subtle p-5">
          <h3 className="text-xl font-bold">Improve your job matches</h3>
          <p className="mt-1 max-w-xl font-secondary text-sm leading-6 text-muted-foreground">
            Complete one private career profile so this group can find relevant
            opportunities without asking for the same details again.
          </p>
          <ProfileCompleteness
            className="mt-5 max-w-md"
            value={profile?.completeness ?? 0}
          />
          <Button asChild className="mt-5" variant="brand">
            <Link href="/app/profile/setup">
              Complete profile
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        </section>
      ) : null}
      <section className="mt-10 border-t pt-8">
        <h3 className="text-2xl font-bold">{emptyState.title}</h3>
        <p className="mt-2 max-w-xl font-secondary leading-7 text-muted-foreground">
          {emptyState.description}
        </p>
      </section>
    </div>
  );
}
