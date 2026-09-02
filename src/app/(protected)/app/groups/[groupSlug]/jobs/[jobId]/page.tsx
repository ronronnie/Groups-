import {
  ArrowLeft,
  BriefcaseBusiness,
  ExternalLink,
  MapPin,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  employmentTypeLabels,
  workModeLabels,
} from "@/features/jobs/components/job-card";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createGroupSqlExecutor } from "@/server/groups/database";
import { getMemberGroupBySlug } from "@/server/groups/service";
import { createJobSqlExecutor } from "@/server/jobs/database";
import { getGroupJob } from "@/server/jobs/service";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
});

export default async function GroupJobDetailPage({
  params,
}: {
  params: Promise<{ groupSlug: string; jobId: string }>;
}) {
  const { groupSlug, jobId } = await params;
  const user = await requireCurrentUser(
    `/app/groups/${groupSlug}/jobs/${jobId}`,
  );
  const group = await getMemberGroupBySlug(
    createGroupSqlExecutor(),
    groupSlug,
    user.id,
  );

  if (!group) notFound();

  const job = await getGroupJob(createJobSqlExecutor(), {
    groupId: group.id,
    jobId,
    viewerId: user.id,
  });

  if (!job) notFound();

  const workMode = workModeLabels[job.workMode];
  const employmentType = employmentTypeLabels[job.employmentType];

  return (
    <main className="max-w-4xl">
      <Button asChild className="mb-7" variant="ghost">
        <Link href={`/app/groups/${group.slug}/jobs`}>
          <ArrowLeft aria-hidden="true" className="size-4" />
          Jobs
        </Link>
      </Button>

      <div className="flex flex-col items-start justify-between gap-5 sm:flex-row">
        <div className="min-w-0 max-w-2xl">
          <p className="font-secondary text-sm font-bold uppercase text-brand">
            {job.company}
          </p>
          <h2 className="mt-2 text-4xl font-bold sm:text-5xl">{job.title}</h2>
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
        <Button asChild variant="brand">
          <a href={job.canonicalUrl} rel="noreferrer" target="_blank">
            <ExternalLink aria-hidden="true" className="size-4" />
            Open job
          </a>
        </Button>
      </div>

      <dl className="mt-9 grid gap-5 border-t pt-7 font-secondary sm:grid-cols-2">
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
      </dl>

      {job.descriptionSummary ? (
        <section className="mt-9 border-t pt-7" aria-labelledby="job-summary">
          <h3 className="text-2xl font-bold" id="job-summary">
            Job summary
          </h3>
          <p className="mt-3 max-w-3xl font-secondary leading-7 text-muted-foreground">
            {job.descriptionSummary}
          </p>
        </section>
      ) : null}

      <section className="mt-9 border-t pt-7" aria-labelledby="shared-by">
        <div className="flex items-center gap-3">
          <Users aria-hidden="true" className="size-5" />
          <h3 className="text-2xl font-bold" id="shared-by">
            Shared by
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
              {share.note ? (
                <p className="mt-2 max-w-2xl font-secondary text-sm leading-6 text-muted-foreground">
                  {share.note}
                </p>
              ) : (
                <p className="mt-2 font-secondary text-sm text-muted-foreground">
                  Shared without a note.
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
