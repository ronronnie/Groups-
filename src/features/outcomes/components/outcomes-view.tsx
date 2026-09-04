import { LockKeyhole, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { outcomeLabels } from "@/domains/outcomes/outcome";
import { OutcomeSharingForm } from "@/features/outcomes/components/outcome-forms";
import type { OutcomeItem } from "@/server/outcomes/service";

export function OutcomesView({
  outcomes,
  groupSlug,
  userId,
  scope,
}: {
  outcomes: OutcomeItem[];
  groupSlug: string;
  userId: string;
  scope: "mine" | "group";
}) {
  return (
    <div className="min-w-0">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <h2 className="text-3xl font-bold">Outcomes</h2>
        <Button asChild size="sm" variant="outline">
          <Link href={`/app/groups/${groupSlug}/tracker`}>
            Application tracker
          </Link>
        </Button>
      </header>
      <nav
        aria-label="Outcome visibility"
        className="mt-6 flex flex-wrap gap-2"
      >
        <Button
          asChild
          size="sm"
          variant={scope === "mine" ? "default" : "outline"}
        >
          <Link
            aria-current={scope === "mine" ? "page" : undefined}
            href={`/app/groups/${groupSlug}/outcomes`}
          >
            <LockKeyhole aria-hidden="true" className="size-4" />
            My outcomes
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant={scope === "group" ? "default" : "outline"}
        >
          <Link
            aria-current={scope === "group" ? "page" : undefined}
            href={`/app/groups/${groupSlug}/outcomes?view=group`}
          >
            <Users aria-hidden="true" className="size-4" />
            Shared with group
          </Link>
        </Button>
      </nav>
      {outcomes.length ? (
        <div className="mt-6 grid items-start gap-5 lg:grid-cols-2">
          {outcomes.map((outcome) => (
            <article
              className="min-w-0 break-words rounded-lg border bg-surface p-5"
              key={outcome.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Trophy aria-hidden="true" className="size-6 text-brand" />
                <StatusBadge
                  tone={outcome.visibility === "group" ? "success" : "neutral"}
                >
                  {outcome.visibility === "group"
                    ? "Shared with group"
                    : "Private"}
                </StatusBadge>
              </div>
              <h3 className="mt-3 text-2xl font-bold">
                {outcomeLabels[outcome.outcomeType]}
              </h3>
              <p className="mt-1 font-secondary text-sm">
                {outcome.subjectUserId === userId ? "You" : outcome.subjectName}{" "}
                at {outcome.company}
              </p>
              <Link
                className="mt-2 inline-block font-secondary text-sm underline underline-offset-4"
                href={`/app/groups/${groupSlug}/jobs/${outcome.jobId}`}
              >
                {outcome.title}
              </Link>
              <dl className="mt-4 space-y-2 font-secondary text-sm">
                <div>
                  <dt className="text-muted-foreground">Job sharer credited</dt>
                  <dd className="font-bold">
                    {outcome.sharerName ?? "No attribution"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Referrer credited</dt>
                  <dd className="font-bold">
                    {outcome.referrerName ?? "No attribution"}
                  </dd>
                </div>
              </dl>
              {outcome.subjectUserId === userId ? (
                <OutcomeSharingForm
                  groupSlug={groupSlug}
                  outcomeId={outcome.id}
                  shared={outcome.visibility === "group"}
                  key={`${outcome.id}-${outcome.visibility}`}
                />
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-8"
          icon={Trophy}
          title={
            scope === "mine" ? "No outcomes yet" : "No shared outcomes yet"
          }
          description={
            scope === "mine"
              ? "Your interview, offer and hired milestones belong here."
              : "Outcomes appear here only when their owners choose to share."
          }
        />
      )}
    </div>
  );
}
