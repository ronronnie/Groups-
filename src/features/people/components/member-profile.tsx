import { ArrowLeft, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CareerProfileSummary } from "@/features/profiles/components/career-profile-summary";
import { ContributionBadges } from "@/features/people/components/contribution-badges";
import type {
  GroupMemberDirectoryItem,
  MemberContributionHighlight,
} from "@/server/people/service";
import type { PublicCareerProfile } from "@/server/profiles/service";

export function MemberProfile({
  contributions,
  groupSlug,
  member,
  profile,
}: Readonly<{
  contributions: MemberContributionHighlight[];
  groupSlug: string;
  member: GroupMemberDirectoryItem;
  profile: PublicCareerProfile | null;
}>) {
  return (
    <div className="max-w-4xl">
      <Button asChild size="sm" variant="ghost">
        <Link href={`/app/groups/${groupSlug}/people`}>
          <ArrowLeft aria-hidden="true" className="size-4" />
          People
        </Link>
      </Button>

      <header className="mt-6 flex items-start gap-4">
        <Avatar alt={member.displayName} className="size-16" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="break-words text-3xl font-bold">
              {member.displayName}
            </h2>
            {member.membershipRole !== "member" ? (
              <StatusBadge>{member.membershipRole}</StatusBadge>
            ) : null}
          </div>
          <p className="mt-2 font-secondary text-muted-foreground">
            {member.currentRole || member.headline || "Group member"}
          </p>
          <div className="mt-4">
            <ContributionBadges badges={member.badges} />
          </div>
        </div>
      </header>

      <section
        aria-labelledby="contribution-heading"
        className="mt-10 border-t pt-8"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-2xl font-bold" id="contribution-heading">
              Contributions
            </h3>
            <p className="mt-1 font-secondary text-sm text-muted-foreground">
              Earned through useful group actions.
            </p>
          </div>
          <p className="font-secondary text-sm font-bold">
            {member.totalPoints} contribution points
          </p>
        </div>

        {contributions.length ? (
          <dl className="mt-6 grid gap-px border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {contributions.map((contribution) => (
              <div className="bg-surface p-5" key={contribution.eventType}>
                <dt className="font-secondary text-sm text-muted-foreground">
                  {contribution.label}
                </dt>
                <dd className="mt-2 text-2xl font-bold">
                  {contribution.count}
                </dd>
                <dd className="mt-1 font-secondary text-xs text-muted-foreground">
                  {contribution.points} points
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-6 border-l-4 border-border bg-surface-subtle p-5 font-secondary text-sm text-muted-foreground">
            No contribution highlights yet.
          </p>
        )}
      </section>

      <div className="mt-10">
        {profile ? (
          <CareerProfileSummary profile={profile} />
        ) : (
          <section className="border-t pt-8">
            <div className="flex items-start gap-3">
              <LockKeyhole
                aria-hidden="true"
                className="mt-0.5 size-5 text-muted-foreground"
              />
              <div>
                <h3 className="text-xl font-bold">Career profile is private</h3>
                <p className="mt-1 max-w-xl font-secondary text-sm leading-6 text-muted-foreground">
                  This member has not shared their career details with the
                  group.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
