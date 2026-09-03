import {
  Bookmark,
  BookmarkCheck,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ExternalLink,
  MapPin,
  RotateCcw,
  Sparkles,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AI_DISPLAY_NAME } from "@/config/brand";
import { FeedActionButton } from "@/features/jobs/components/feed-action-button";
import {
  employmentTypeLabels,
  workModeLabels,
} from "@/features/jobs/components/job-card";
import {
  markJobAppliedAction,
  setJobDismissedAction,
  setJobSavedAction,
} from "@/server/jobs/feed-actions";
import type { ForYouFeedItem } from "@/server/jobs/feed-service";

const strengthLabels = {
  strong: "Strong match",
  good: "Good match",
  possible: "Possible match",
} as const;

const strengthTones = {
  strong: "success",
  good: "info",
  possible: "neutral",
} as const;

function getSharerLabel(job: ForYouFeedItem) {
  const names = [...new Set(job.shares.map((share) => share.sharerName))];
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]} and ${names.length - 1} others`;
}

export function ForYouJobCard({
  groupId,
  groupSlug,
  job,
}: Readonly<{
  groupId: string;
  groupSlug: string;
  job: ForYouFeedItem;
}>) {
  const workMode = workModeLabels[job.workMode];
  const employmentType = employmentTypeLabels[job.employmentType];
  const applied =
    job.applicationStatus !== null && job.applicationStatus !== "saved";

  return (
    <article className="rounded-lg border-2 border-border-strong bg-surface p-5 shadow-pop sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-secondary text-xs font-bold uppercase text-brand">
            {job.company}
          </p>
          <h3 className="mt-1 text-2xl font-bold">
            <Link
              className="underline-offset-4 hover:underline"
              href={`/app/groups/${groupSlug}/jobs/${job.id}`}
            >
              {job.title}
            </Link>
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={strengthTones[job.matchStrength]}>
            {strengthLabels[job.matchStrength]}
          </StatusBadge>
          <span
            className="font-secondary text-sm font-bold"
            title="Match score"
          >
            {job.matchScore}%
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-secondary text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Building2 aria-hidden="true" className="size-4" />
          {job.company}
        </span>
        {job.location ? (
          <span className="inline-flex items-center gap-1.5">
            <MapPin aria-hidden="true" className="size-4" />
            {job.location}
          </span>
        ) : null}
        {workMode ? <StatusBadge tone="info">{workMode}</StatusBadge> : null}
        {employmentType ? <StatusBadge>{employmentType}</StatusBadge> : null}
      </div>

      <div className="mt-5 border-l-4 border-brand bg-surface-subtle px-4 py-3">
        <p className="flex items-center gap-2 font-secondary text-xs font-bold uppercase text-brand">
          <Sparkles aria-hidden="true" className="size-4" />
          {AI_DISPLAY_NAME} match
        </p>
        <p className="mt-1 font-secondary text-sm leading-6 text-muted-foreground">
          {job.explanation}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 font-secondary text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Users aria-hidden="true" className="size-4" />
          Shared by {getSharerLabel(job)}
        </span>
        {job.referralMemberCount > 0 ? (
          <span className="inline-flex items-center gap-2 text-foreground">
            <UserRoundCheck
              aria-hidden="true"
              className="size-4 text-success"
            />
            {job.referralMemberCount} group{" "}
            {job.referralMemberCount === 1 ? "member" : "members"} may be able
            to refer
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
        <Button asChild size="sm" variant="brand">
          <a href={job.canonicalUrl} rel="noreferrer" target="_blank">
            <ExternalLink aria-hidden="true" className="size-4" />
            Open job
          </a>
        </Button>

        {job.referralMemberCount > 0 ? (
          <Button asChild size="sm" variant="outline">
            <Link
              href={`/app/groups/${groupSlug}/jobs/${job.id}#referral-entry`}
            >
              <UserRoundCheck aria-hidden="true" className="size-4" />
              Request referral
            </Link>
          </Button>
        ) : null}

        <form
          action={setJobSavedAction.bind(
            null,
            groupId,
            groupSlug,
            job.id,
            !job.saved,
          )}
        >
          <FeedActionButton pendingLabel="Saving" size="sm" variant="outline">
            {job.saved ? (
              <BookmarkCheck aria-hidden="true" className="size-4" />
            ) : (
              <Bookmark aria-hidden="true" className="size-4" />
            )}
            {job.saved ? "Saved" : "Save"}
          </FeedActionButton>
        </form>

        {applied ? (
          <StatusBadge tone="success">
            <CheckCircle2 aria-hidden="true" className="size-4" />
            Applied
          </StatusBadge>
        ) : (
          <form
            action={markJobAppliedAction.bind(null, groupId, groupSlug, job.id)}
          >
            <FeedActionButton
              pendingLabel="Updating"
              size="sm"
              variant="outline"
            >
              <BriefcaseBusiness aria-hidden="true" className="size-4" />
              Mark applied
            </FeedActionButton>
          </form>
        )}

        <form
          action={setJobDismissedAction.bind(
            null,
            groupId,
            groupSlug,
            job.id,
            !job.dismissed,
          )}
          className="sm:ml-auto"
        >
          <FeedActionButton pendingLabel="Updating" size="sm" variant="ghost">
            {job.dismissed ? (
              <RotateCcw aria-hidden="true" className="size-4" />
            ) : (
              <X aria-hidden="true" className="size-4" />
            )}
            {job.dismissed ? "Restore" : "Dismiss"}
          </FeedActionButton>
        </form>
      </div>
    </article>
  );
}
