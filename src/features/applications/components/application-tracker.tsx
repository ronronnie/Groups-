import {
  BriefcaseBusiness,
  CalendarClock,
  ExternalLink,
  FileText,
  History,
  LayoutGrid,
  List,
  LockKeyhole,
} from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import {
  applicationStatusLabels,
  applicationStatuses,
  type ApplicationStatus,
  type ApplicationTrackerFilter,
  type ApplicationTrackerView,
} from "@/domains/applications/tracker";
import { TrackerDetailsForm } from "@/features/applications/components/tracker-details-form";
import { FeedActionButton } from "@/features/jobs/components/feed-action-button";
import { cn } from "@/lib/utils";
import { updateApplicationStatusAction } from "@/server/applications/actions";
import type { ApplicationTrackerItem } from "@/server/applications/service";

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
const selectClassName =
  "h-10 rounded-md border border-input bg-background px-3 font-secondary text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25";

const statusTones: Record<
  ApplicationStatus,
  "neutral" | "info" | "warning" | "success" | "danger"
> = {
  saved: "neutral",
  applied: "info",
  interviewing: "warning",
  offer: "success",
  rejected: "danger",
  withdrawn: "neutral",
  hired: "success",
};

function trackerHref(
  groupSlug: string,
  view: ApplicationTrackerView,
  filter: ApplicationTrackerFilter,
) {
  const query = new URLSearchParams();
  query.set("view", view);
  if (filter !== "all") query.set("status", filter);
  return `/app/groups/${groupSlug}/tracker?${query.toString()}`;
}

function StatusForm({
  application,
  groupId,
  groupSlug,
}: Readonly<{
  application: ApplicationTrackerItem;
  groupId: string;
  groupSlug: string;
}>) {
  return (
    <form
      action={updateApplicationStatusAction.bind(
        null,
        groupId,
        groupSlug,
        application.id,
      )}
      className="flex flex-wrap items-center gap-2"
    >
      <label className="sr-only" htmlFor={`status-${application.id}`}>
        Application status
      </label>
      <select
        className={cn(selectClassName, "min-w-36 flex-1")}
        defaultValue={application.status}
        id={`status-${application.id}`}
        name="status"
      >
        {applicationStatuses.map((status) => (
          <option key={status} value={status}>
            {applicationStatusLabels[status]}
          </option>
        ))}
      </select>
      <FeedActionButton pendingLabel="Moving" size="sm" variant="outline">
        Move
      </FeedActionButton>
    </form>
  );
}

function Timeline({ application }: { application: ApplicationTrackerItem }) {
  return (
    <details className="mt-4 border-t pt-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-secondary text-sm font-bold">
        <History aria-hidden="true" className="size-4" />
        Timeline ({application.timeline.length})
      </summary>
      <ol className="mt-3 space-y-3 border-l-2 pl-4 font-secondary text-sm">
        {application.timeline.map((event) => (
          <li key={event.id}>
            <p className="font-bold">
              {applicationStatusLabels[event.toStatus]}
            </p>
            <time
              className="text-xs text-muted-foreground"
              dateTime={event.createdAt.toISOString()}
            >
              {dateFormatter.format(event.createdAt)}
            </time>
          </li>
        ))}
      </ol>
    </details>
  );
}

function TrackerCard({
  application,
  groupId,
  groupSlug,
}: Readonly<{
  application: ApplicationTrackerItem;
  groupId: string;
  groupSlug: string;
}>) {
  return (
    <article className="rounded-lg border-2 border-border-strong bg-surface p-4 shadow-pop">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-secondary text-xs font-bold uppercase text-brand">
            {application.company}
          </p>
          <h3 className="mt-1 text-xl font-bold">
            <Link
              className="underline-offset-4 hover:underline"
              href={`/app/groups/${groupSlug}/jobs/${application.jobId}`}
            >
              {application.title}
            </Link>
          </h3>
          {application.location ? (
            <p className="mt-1 font-secondary text-sm text-muted-foreground">
              {application.location}
            </p>
          ) : null}
        </div>
        <StatusBadge tone={statusTones[application.status]}>
          {applicationStatusLabels[application.status]}
        </StatusBadge>
      </div>

      {application.nextAction ? (
        <div className="mt-4 border-l-4 border-info bg-info/10 px-3 py-2 font-secondary text-sm">
          <p className="font-bold">{application.nextAction}</p>
          {application.nextActionDate ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock aria-hidden="true" className="size-3.5" />
              {dateFormatter.format(
                new Date(`${application.nextActionDate}T12:00:00Z`),
              )}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4">
        <StatusForm
          application={application}
          groupId={groupId}
          groupSlug={groupSlug}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
        <Button asChild size="sm" variant="brand">
          <a href={application.canonicalUrl} rel="noreferrer" target="_blank">
            <ExternalLink aria-hidden="true" className="size-4" />
            Open job
          </a>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/app/groups/${groupSlug}/jobs/${application.jobId}`}>
            <BriefcaseBusiness aria-hidden="true" className="size-4" />
            Details
          </Link>
        </Button>
      </div>

      <details className="mt-4 border-t pt-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-secondary text-sm font-bold">
          <FileText aria-hidden="true" className="size-4" />
          Notes and next action
        </summary>
        <TrackerDetailsForm
          applicationId={application.id}
          groupId={groupId}
          groupSlug={groupSlug}
          nextAction={application.nextAction}
          nextActionDate={application.nextActionDate}
          privateNotes={application.privateNotes}
        />
      </details>
      <Timeline application={application} />
    </article>
  );
}

export function ApplicationTracker({
  applications,
  filter,
  groupId,
  groupSlug,
  view,
}: Readonly<{
  applications: ApplicationTrackerItem[];
  filter: ApplicationTrackerFilter;
  groupId: string;
  groupSlug: string;
  view: ApplicationTrackerView;
}>) {
  const visibleStatuses: readonly ApplicationStatus[] =
    filter === "all" ? applicationStatuses : [filter];

  return (
    <div className="min-w-0">
      <header className="flex flex-col justify-between gap-5 border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-secondary text-sm font-bold uppercase text-brand">
            Your private workspace
          </p>
          <h2 className="mt-1 text-4xl font-bold sm:text-5xl">
            Application tracker
          </h2>
          <p className="mt-2 flex max-w-2xl items-start gap-2 font-secondary text-sm leading-6 text-muted-foreground">
            <LockKeyhole aria-hidden="true" className="mt-1 size-4 shrink-0" />
            Stages, notes, and next actions are visible only to you.
          </p>
        </div>
        <div aria-label="Tracker view" className="flex gap-1" role="group">
          <Button
            asChild
            size="sm"
            variant={view === "board" ? "default" : "outline"}
          >
            <Link href={trackerHref(groupSlug, "board", filter)}>
              <LayoutGrid aria-hidden="true" className="size-4" />
              Board
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant={view === "list" ? "default" : "outline"}
          >
            <Link href={trackerHref(groupSlug, "list", filter)}>
              <List aria-hidden="true" className="size-4" />
              List
            </Link>
          </Button>
        </div>
      </header>

      <form className="mt-6 flex flex-wrap items-end gap-3" method="get">
        <input name="view" type="hidden" value={view} />
        <div className="grid gap-1.5">
          <label
            className="font-secondary text-xs font-bold uppercase text-muted-foreground"
            htmlFor="tracker-status-filter"
          >
            Status
          </label>
          <select
            className={cn(selectClassName, "min-w-44")}
            defaultValue={filter}
            id="tracker-status-filter"
            name="status"
          >
            <option value="all">All statuses</option>
            {applicationStatuses.map((status) => (
              <option key={status} value={status}>
                {applicationStatusLabels[status]}
              </option>
            ))}
          </select>
        </div>
        <Button size="sm" type="submit" variant="outline">
          Filter
        </Button>
      </form>

      {applications.length === 0 ? (
        <EmptyState
          className="mt-8"
          description={
            filter === "all"
              ? "Save a job or mark it as applied to start tracking it here."
              : `You have no ${applicationStatusLabels[filter].toLowerCase()} applications in this group.`
          }
          icon={BriefcaseBusiness}
          title={filter === "all" ? "No applications yet" : "No matches"}
        />
      ) : view === "board" ? (
        <div className="mt-8 grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleStatuses.map((status) => {
            const statusApplications = applications.filter(
              (application) => application.status === status,
            );

            return (
              <section aria-labelledby={`stage-${status}`} key={status}>
                <div className="mb-3 flex items-center justify-between border-b-2 border-border-strong pb-2">
                  <h3 className="text-xl font-bold" id={`stage-${status}`}>
                    {applicationStatusLabels[status]}
                  </h3>
                  <StatusBadge tone={statusTones[status]}>
                    {statusApplications.length}
                  </StatusBadge>
                </div>
                {statusApplications.length ? (
                  <div className="space-y-4">
                    {statusApplications.map((application) => (
                      <TrackerCard
                        application={application}
                        groupId={groupId}
                        groupSlug={groupSlug}
                        key={application.id}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="border border-dashed p-4 font-secondary text-sm text-muted-foreground">
                    Nothing here.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {applications.map((application) => (
            <TrackerCard
              application={application}
              groupId={groupId}
              groupSlug={groupSlug}
              key={application.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
