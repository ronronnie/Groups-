import { ReportContentForm } from "@/features/groups/components/admin-forms";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  BriefcaseBusiness,
  CalendarDays,
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
import { JobDiscussion } from "@/features/jobs/components/job-discussion";
import { ReferralRequestPanel } from "@/features/referrals/components/referral-request-panel";
import {
  markJobAppliedAction,
  setJobDismissedAction,
  setJobSavedAction,
} from "@/server/jobs/feed-actions";
import type { GroupJobDetail } from "@/server/jobs/detail-service";
import type { JobDiscussionMessage } from "@/server/jobs/discussion-service";
import type { PotentialReferrerOption } from "@/server/referrals/service";

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

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

function experienceLabel(minimum: number | null, maximum: number | null) {
  if (minimum !== null && maximum !== null) {
    return minimum === maximum
      ? `${minimum} years`
      : `${minimum}-${maximum} years`;
  }
  if (minimum !== null) return `${minimum}+ years`;
  if (maximum !== null) return `Up to ${maximum} years`;
  return null;
}

function JobDetailActions({
  detail,
  groupId,
  groupSlug,
}: Readonly<{
  detail: GroupJobDetail;
  groupId: string;
  groupSlug: string;
}>) {
  const applied =
    detail.applicationStatus !== null && detail.applicationStatus !== "saved";

  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
      <Button asChild variant="brand">
        <a
          className="w-full sm:w-auto"
          href={detail.job.canonicalUrl}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink aria-hidden="true" className="size-4" />
          Open job
        </a>
      </Button>
      <form
        className="min-w-0"
        action={setJobSavedAction.bind(
          null,
          groupId,
          groupSlug,
          detail.job.id,
          !detail.saved,
        )}
      >
        <FeedActionButton
          className="w-full sm:w-auto"
          pendingLabel="Saving"
          variant="outline"
        >
          {detail.saved ? (
            <BookmarkCheck aria-hidden="true" className="size-4" />
          ) : (
            <Bookmark aria-hidden="true" className="size-4" />
          )}
          {detail.saved ? "Saved" : "Save"}
        </FeedActionButton>
      </form>
      {applied ? (
        <StatusBadge className="min-h-10 px-3" tone="success">
          <CheckCircle2 aria-hidden="true" className="size-4" />
          Applied
        </StatusBadge>
      ) : (
        <form
          className="min-w-0"
          action={markJobAppliedAction.bind(
            null,
            groupId,
            groupSlug,
            detail.job.id,
          )}
        >
          <FeedActionButton
            className="w-full sm:w-auto"
            pendingLabel="Updating"
            variant="outline"
          >
            <BriefcaseBusiness aria-hidden="true" className="size-4" />
            Mark applied
          </FeedActionButton>
        </form>
      )}
      <form
        className="col-span-2 min-w-0 sm:ml-auto"
        action={setJobDismissedAction.bind(
          null,
          groupId,
          groupSlug,
          detail.job.id,
          !detail.dismissed,
        )}
      >
        <FeedActionButton
          className="w-full sm:w-auto"
          pendingLabel="Updating"
          variant="ghost"
        >
          {detail.dismissed ? (
            <RotateCcw aria-hidden="true" className="size-4" />
          ) : (
            <X aria-hidden="true" className="size-4" />
          )}
          {detail.dismissed ? "Restore" : "Dismiss"}
        </FeedActionButton>
      </form>
    </div>
  );
}

export function JobDetail({
  detail,
  groupId,
  groupSlug,
  messages,
  potentialReferrers,
}: Readonly<{
  detail: GroupJobDetail;
  groupId: string;
  groupSlug: string;
  messages: JobDiscussionMessage[];
  potentialReferrers: PotentialReferrerOption[];
}>) {
  const { job } = detail;
  const workMode = workModeLabels[job.workMode];
  const employmentType = employmentTypeLabels[job.employmentType];
  const experience = experienceLabel(job.experienceMin, job.experienceMax);

  return (
    <div className="max-w-4xl">
      <Button asChild className="mb-7" variant="ghost">
        <Link href={`/app/groups/${groupSlug}/jobs`}>
          <ArrowLeft aria-hidden="true" className="size-4" />
          Jobs
        </Link>
      </Button>

      <div className="flex flex-col items-start justify-between gap-6 lg:flex-row">
        <div className="min-w-0 max-w-2xl">
          <p className="font-secondary text-sm font-bold uppercase text-brand">
            {job.company}
          </p>
          <h2 className="mt-2 break-words text-3xl font-bold sm:text-5xl">
            {job.title}
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge tone={job.status === "active" ? "success" : "neutral"}>
              {job.status === "active" ? "Active" : job.status}
            </StatusBadge>
            {workMode ? (
              <StatusBadge tone="info">{workMode}</StatusBadge>
            ) : null}
            {employmentType ? (
              <StatusBadge>{employmentType}</StatusBadge>
            ) : null}
          </div>
        </div>
        <JobDetailActions
          detail={detail}
          groupId={groupId}
          groupSlug={groupSlug}
        />
      </div>

      <section className="mt-9 border-l-4 border-brand bg-surface-subtle px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles aria-hidden="true" className="size-5 text-brand" />
          <h3 className="text-xl font-bold">{AI_DISPLAY_NAME} match</h3>
          <StatusBadge tone={strengthTones[detail.matchStrength]}>
            {strengthLabels[detail.matchStrength]}, {detail.matchScore}%
          </StatusBadge>
        </div>
        <p className="mt-2 max-w-3xl font-secondary text-sm leading-6 text-muted-foreground">
          {detail.matchExplanation}
        </p>
      </section>

      <dl className="mt-9 grid gap-6 border-t pt-7 font-secondary sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex gap-3">
          <BriefcaseBusiness aria-hidden="true" className="mt-0.5 size-5" />
          <div>
            <dt className="text-xs font-bold uppercase text-muted-foreground">
              Company
            </dt>
            <dd className="mt-1">{job.company}</dd>
          </div>
        </div>
        {job.location ? (
          <div className="flex gap-3">
            <MapPin aria-hidden="true" className="mt-0.5 size-5" />
            <div>
              <dt className="text-xs font-bold uppercase text-muted-foreground">
                Location
              </dt>
              <dd className="mt-1">{job.location}</dd>
            </div>
          </div>
        ) : null}
        {experience ? (
          <div className="flex gap-3">
            <CalendarDays aria-hidden="true" className="mt-0.5 size-5" />
            <div>
              <dt className="text-xs font-bold uppercase text-muted-foreground">
                Experience
              </dt>
              <dd className="mt-1">{experience}</dd>
            </div>
          </div>
        ) : null}
      </dl>

      {job.salaryText || job.skills.length ? (
        <section
          aria-labelledby="job-requirements"
          className="mt-9 border-t pt-7"
        >
          <h3 className="text-2xl font-bold" id="job-requirements">
            Job details
          </h3>
          {job.salaryText ? (
            <p className="mt-3 font-secondary">
              <span className="font-bold">Salary:</span> {job.salaryText}
            </p>
          ) : null}
          {job.skills.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {job.skills.map((skill) => (
                <StatusBadge key={skill}>{skill}</StatusBadge>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {job.descriptionSummary ? (
        <section aria-labelledby="job-summary" className="mt-9 border-t pt-7">
          <div className="flex items-center gap-2">
            <Sparkles aria-hidden="true" className="size-5 text-brand" />
            <h3 className="text-2xl font-bold" id="job-summary">
              {AI_DISPLAY_NAME} summary
            </h3>
          </div>
          <p className="mt-3 max-w-3xl font-secondary leading-7 text-muted-foreground">
            {job.descriptionSummary}
          </p>
        </section>
      ) : null}

      <section aria-labelledby="referral-entry" className="mt-9 border-t pt-7">
        <div className="flex items-center gap-3">
          <UserRoundCheck aria-hidden="true" className="size-5" />
          <h3 className="text-2xl font-bold" id="referral-entry">
            Referral
          </h3>
        </div>
        <p className="mt-2 max-w-2xl font-secondary text-sm leading-6 text-muted-foreground">
          {potentialReferrers.length > 0
            ? `${potentialReferrers.length} relevant group ${potentialReferrers.length === 1 ? "member is" : "members are"} available for a private request.`
            : "Ask the group if someone can offer context or help with a referral."}
        </p>
        <ReferralRequestPanel
          candidates={potentialReferrers}
          groupId={groupId}
          groupSlug={groupSlug}
          jobId={job.id}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href="#discussion-composer">Ask in discussion</a>
          </Button>
          <Button asChild variant="ghost">
            <Link href={`/app/groups/${groupSlug}/referrals`}>
              Referral inbox
            </Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="shared-by" className="mt-9 border-t pt-7">
        <div className="flex items-center gap-3">
          <Users aria-hidden="true" className="size-5" />
          <h3 className="text-2xl font-bold" id="shared-by">
            Share history
          </h3>
        </div>
        <ul className="mt-5 divide-y border-y">
          {job.shares.map((share) => (
            <li className="py-5" key={share.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold">{share.sharerName}</p>
                <time
                  className="font-secondary text-xs text-muted-foreground"
                  dateTime={share.sharedAt.toISOString()}
                >
                  {dateFormatter.format(share.sharedAt)}
                </time>
              </div>
              <p className="mt-2 max-w-2xl font-secondary text-sm leading-6 text-muted-foreground">
                {share.note ?? "Shared without a note."}
              </p>
              <ReportContentForm
                groupId={groupId}
                targetId={share.id}
                targetType="job_share"
              />
            </li>
          ))}
        </ul>
      </section>

      <JobDiscussion
        groupId={groupId}
        groupSlug={groupSlug}
        jobId={job.id}
        messages={messages}
      />
    </div>
  );
}
