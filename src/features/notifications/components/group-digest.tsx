import {
  BookmarkCheck,
  BriefcaseBusiness,
  Handshake,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import type { GroupDigest as GroupDigestData } from "@/server/digests/service";

function JobList({
  jobs,
}: {
  jobs: Array<{ id: string; title: string; company: string; href: string }>;
}) {
  return jobs.length ? (
    <ul className="divide-y border-y">
      {jobs.map((job) => (
        <li key={job.id}>
          <Link className="block py-3 hover:underline" href={job.href}>
            <span className="block font-bold">{job.title}</span>
            <span className="font-secondary text-sm text-muted-foreground">
              {job.company}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  ) : (
    <p className="font-secondary text-sm text-muted-foreground">
      Nothing needs action in this period.
    </p>
  );
}

export function GroupDigest({ digest }: { digest: GroupDigestData }) {
  const periodLabel = digest.cadence === "daily" ? "Daily" : "Weekly";
  const hasActivity =
    digest.jobsShared > 0 ||
    digest.strongMatches.length > 0 ||
    digest.referralOpportunities.length > 0 ||
    digest.savedJobsNeedingAction.length > 0 ||
    digest.contributionHighlights.length > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <header className="flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold">Your group catch-up</h2>
            <StatusBadge tone="info">{periodLabel}</StatusBadge>
          </div>
          <p className="font-secondary mt-2 text-sm leading-6 text-muted-foreground">
            Deterministic activity and private recommendations prepared only for
            you.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="?period=daily">Daily</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="?period=weekly">Weekly</Link>
          </Button>
        </div>
      </header>

      {!hasActivity ? (
        <EmptyState
          description="There is no new group activity or private action waiting in this period."
          icon={Sparkles}
          title="You are caught up"
        />
      ) : (
        <>
          <section aria-labelledby="digest-overview" className="space-y-4">
            <h3
              className="flex items-center gap-2 text-xl font-bold"
              id="digest-overview"
            >
              <BriefcaseBusiness aria-hidden="true" className="size-5" />
              Group activity
            </h3>
            <p className="font-secondary text-sm text-muted-foreground">
              {digest.jobsShared}{" "}
              {digest.jobsShared === 1 ? "job was" : "jobs were"} shared during
              this period.
            </p>
            {digest.contributionHighlights.length ? (
              <ul className="space-y-2 border-l-2 border-brand pl-4">
                {digest.contributionHighlights.map((highlight) => (
                  <li className="font-secondary text-sm" key={highlight.id}>
                    {highlight.summary}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section aria-labelledby="digest-matches" className="space-y-4">
            <h3
              className="flex items-center gap-2 text-xl font-bold"
              id="digest-matches"
            >
              <Sparkles aria-hidden="true" className="size-5" />
              Strong matches for you
            </h3>
            <JobList jobs={digest.strongMatches} />
          </section>

          <section aria-labelledby="digest-referrals" className="space-y-4">
            <h3
              className="flex items-center gap-2 text-xl font-bold"
              id="digest-referrals"
            >
              <Handshake aria-hidden="true" className="size-5" />
              Referral opportunities
            </h3>
            <JobList jobs={digest.referralOpportunities} />
          </section>

          <section aria-labelledby="digest-saved" className="space-y-4">
            <h3
              className="flex items-center gap-2 text-xl font-bold"
              id="digest-saved"
            >
              <BookmarkCheck aria-hidden="true" className="size-5" />
              Saved jobs needing action
            </h3>
            <JobList jobs={digest.savedJobsNeedingAction} />
          </section>

          <p className="font-secondary flex items-center gap-2 border-t pt-5 text-xs text-muted-foreground">
            <Users aria-hidden="true" className="size-4" />
            Group highlights include only group-visible activity. Your matches,
            referrals, and saved jobs are visible only to you.
          </p>
        </>
      )}
    </div>
  );
}
