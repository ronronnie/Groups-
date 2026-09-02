import { Link2 } from "lucide-react";
import { EmptyState } from "@/components/ui/states";
import { JobCard } from "@/features/jobs/components/job-card";
import { ShareJobForm } from "@/features/jobs/components/share-job-form";
import type { GroupJob } from "@/server/jobs/service";

export function JobsTab({
  groupId,
  groupSlug,
  jobs,
}: Readonly<{ groupId: string; groupSlug: string; jobs: GroupJob[] }>) {
  return (
    <div className="max-w-4xl">
      <div className="space-y-2">
        <p className="font-secondary text-sm font-bold uppercase text-brand">
          Jobs & Referrals
        </p>
        <h2 className="text-4xl font-bold">Jobs</h2>
        <p className="max-w-2xl font-secondary leading-7 text-muted-foreground">
          Share a link once. The group gets a structured job card instead of a
          link buried in chat.
        </p>
      </div>

      <section
        aria-labelledby="share-job-heading"
        className="mt-9 border-t pt-7"
      >
        <h3 className="text-2xl font-bold" id="share-job-heading">
          Share a job
        </h3>
        <p className="mt-1 max-w-2xl font-secondary text-sm leading-6 text-muted-foreground">
          Add the link and, when available, paste the job description for a more
          complete result.
        </p>
        <div className="mt-6">
          <ShareJobForm groupId={groupId} />
        </div>
      </section>

      <section
        aria-labelledby="shared-jobs-heading"
        className="mt-12 border-t pt-8"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold" id="shared-jobs-heading">
              Shared jobs
            </h3>
            <p className="mt-1 font-secondary text-sm text-muted-foreground">
              {jobs.length} {jobs.length === 1 ? "job" : "jobs"}
            </p>
          </div>
        </div>

        {jobs.length ? (
          <div className="mt-6 grid gap-5">
            {jobs.map((job) => (
              <JobCard groupSlug={groupSlug} job={job} key={job.id} />
            ))}
          </div>
        ) : (
          <EmptyState
            className="mt-6"
            description="Paste a job link above to create the first structured job card for this group."
            icon={Link2}
            title="No jobs shared yet"
          />
        )}
      </section>
    </div>
  );
}
