import {
  ArrowRight,
  Building2,
  ExternalLink,
  MapPin,
  Users,
} from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GroupJob } from "@/server/jobs/service";

const workModeLabels = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
  unspecified: null,
} as const;

const employmentTypeLabels = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  temporary: "Temporary",
  unspecified: null,
} as const;

function getSharerLabel(job: GroupJob) {
  const names = [...new Set(job.shares.map((share) => share.sharerName))];
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]} and ${names.length - 1} others`;
}

export function JobCard({
  groupSlug,
  job,
}: Readonly<{ groupSlug: string; job: GroupJob }>) {
  const latestNote = job.shares.find((share) => share.note)?.note;
  const workMode = workModeLabels[job.workMode];
  const employmentType = employmentTypeLabels[job.employmentType];

  return (
    <article className="min-w-0 rounded-lg border-2 border-border-strong bg-surface p-4 shadow-pop sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-secondary text-xs font-bold uppercase text-brand">
            {job.company}
          </p>
          <h3 className="mt-1 break-words text-xl font-bold sm:text-2xl">
            <Link
              className="underline-offset-4 hover:underline"
              href={`/app/groups/${groupSlug}/jobs/${job.id}`}
            >
              {job.title}
            </Link>
          </h3>
        </div>
        <StatusBadge tone={job.status === "active" ? "success" : "neutral"}>
          {job.status === "active" ? "Active" : job.status}
        </StatusBadge>
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

      {job.descriptionSummary ? (
        <p className="mt-4 line-clamp-3 font-secondary text-sm leading-6 text-muted-foreground">
          {job.descriptionSummary}
        </p>
      ) : null}

      {latestNote ? (
        <blockquote className="mt-4 border-l-4 border-accent bg-surface-subtle px-4 py-3 font-secondary text-sm leading-6">
          &ldquo;{latestNote}&rdquo;
        </blockquote>
      ) : null}

      <div className="mt-5 flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 font-secondary text-sm text-muted-foreground">
          <Users aria-hidden="true" className="size-4" />
          Shared by {getSharerLabel(job)}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button asChild size="sm" variant="outline">
            <a
              className="w-full sm:w-auto"
              href={job.canonicalUrl}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink aria-hidden="true" className="size-4" />
              Open job
            </a>
          </Button>
          <Button asChild size="sm">
            <Link
              className="w-full sm:w-auto"
              href={`/app/groups/${groupSlug}/jobs/${job.id}`}
            >
              Details
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export { employmentTypeLabels, workModeLabels };
