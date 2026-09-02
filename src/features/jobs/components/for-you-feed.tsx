import { ArrowRight, BriefcaseBusiness, Inbox, Sparkles } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { AI_DISPLAY_NAME } from "@/config/brand";
import { ForYouJobCard } from "@/features/jobs/components/for-you-job-card";
import { ProfileCompleteness } from "@/features/profiles/components/profile-completeness";
import type { FeedFilter, ForYouFeedItem } from "@/server/jobs/feed-service";
import { cn } from "@/lib/utils";

const filters: { id: FeedFilter; label: string }[] = [
  { id: "recommended", label: "Recommended" },
  { id: "saved", label: "Saved" },
  { id: "applied", label: "Applied" },
  { id: "dismissed", label: "Dismissed" },
];

const emptyStates: Record<FeedFilter, { title: string; description: string }> =
  {
    recommended: {
      title: "No recommendations yet",
      description:
        "Jobs shared with this group will appear here, ranked against your private career profile.",
    },
    saved: {
      title: "No saved jobs",
      description: "Save promising roles to keep them close while you decide.",
    },
    applied: {
      title: "No applied jobs",
      description: "Mark a job as applied to track it here for yourself.",
    },
    dismissed: {
      title: "No dismissed jobs",
      description: "Jobs you dismiss are kept here so you can restore them.",
    },
  };

function filterHref(groupSlug: string, filter: FeedFilter) {
  const path = `/app/groups/${groupSlug}/for-you`;
  return filter === "recommended" ? path : `${path}?view=${filter}`;
}

export function ForYouFeed({
  filter,
  groupId,
  groupSlug,
  items,
  profileCompleteness,
}: Readonly<{
  filter: FeedFilter;
  groupId: string;
  groupSlug: string;
  items: ForYouFeedItem[];
  profileCompleteness: number;
}>) {
  const profileIncomplete = profileCompleteness < 100;
  const emptyState = emptyStates[filter];

  return (
    <div className="max-w-4xl">
      <div className="space-y-2">
        <p className="font-secondary text-sm font-bold uppercase text-brand">
          Jobs & Referrals
        </p>
        <h2 className="text-4xl font-bold">For You</h2>
        <p className="max-w-2xl font-secondary leading-7 text-muted-foreground">
          {AI_DISPLAY_NAME} ranks jobs shared in this group using your private
          career profile.
        </p>
      </div>

      {profileIncomplete ? (
        <section className="mt-8 border-l-4 border-brand bg-surface-subtle p-5">
          <StatusBadge tone="warning">Profile setup needed</StatusBadge>
          <h3 className="mt-3 text-xl font-bold">Improve your job matches</h3>
          <p className="mt-1 max-w-xl font-secondary text-sm leading-6 text-muted-foreground">
            Add your roles, skills, experience, location, and work preference
            once. These details stay private and improve ranking across your
            groups.
          </p>
          <ProfileCompleteness
            className="mt-5 max-w-md"
            value={profileCompleteness}
          />
          <Button asChild className="mt-5" variant="brand">
            <Link href="/app/profile/edit">
              Complete profile
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        </section>
      ) : null}

      <nav aria-label="For You filters" className="mt-9 border-b">
        <div className="flex gap-5 overflow-x-auto">
          {filters.map((item) => (
            <Link
              aria-current={filter === item.id ? "page" : undefined}
              className={cn(
                "shrink-0 border-b-2 px-1 py-3 font-secondary text-sm font-bold transition-colors",
                filter === item.id
                  ? "border-brand text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
              href={filterHref(groupSlug, item.id)}
              key={item.id}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <section aria-live="polite" className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <p className="font-secondary text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "job" : "jobs"}
          </p>
          {filter === "recommended" ? (
            <span className="inline-flex items-center gap-1.5 font-secondary text-xs text-muted-foreground">
              <Sparkles aria-hidden="true" className="size-4 text-brand" />
              Ranked for you
            </span>
          ) : null}
        </div>

        {items.length ? (
          <div className="mt-4 grid gap-5">
            {items.map((job) => (
              <ForYouJobCard
                groupId={groupId}
                groupSlug={groupSlug}
                job={job}
                key={job.id}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              description={emptyState.description}
              icon={filter === "recommended" ? BriefcaseBusiness : Inbox}
              title={emptyState.title}
            />
            {filter === "recommended" ? (
              <div className="mt-4 flex justify-center">
                <Button asChild variant="outline">
                  <Link href={`/app/groups/${groupSlug}/jobs`}>
                    View shared jobs
                  </Link>
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
