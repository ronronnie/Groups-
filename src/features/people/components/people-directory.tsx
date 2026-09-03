import { BriefcaseBusiness, Handshake, Search, Users } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/states";
import {
  peopleDirectoryFilterLabels,
  peopleDirectoryFilters,
  type PeopleDirectoryFilter,
} from "@/domains/reputation/policy";
import { ContributionBadges } from "@/features/people/components/contribution-badges";
import { cn } from "@/lib/utils";
import type { GroupMemberDirectoryItem } from "@/server/people/service";

function filterHref(
  groupSlug: string,
  filter: PeopleDirectoryFilter,
  query: string,
) {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("filter", filter);
  if (query) params.set("q", query);
  const suffix = params.toString();
  return `/app/groups/${groupSlug}/people${suffix ? `?${suffix}` : ""}`;
}

function MemberCard({
  groupSlug,
  member,
}: Readonly<{ groupSlug: string; member: GroupMemberDirectoryItem }>) {
  const roleLine = [member.currentRole, member.currentCompany]
    .filter(Boolean)
    .join(" at ");

  return (
    <article className="border-t border-border py-6 first:border-t-0">
      <div className="flex min-w-0 items-start gap-4">
        <Avatar alt={member.displayName} className="size-12" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="break-words text-xl font-bold">
                {member.displayName}
              </h3>
              <p className="mt-1 font-secondary text-sm text-muted-foreground">
                {roleLine || member.headline || "Group member"}
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={`/app/groups/${groupSlug}/people/${member.userId}`}>
                View profile
              </Link>
            </Button>
          </div>

          {member.skills.length ? (
            <p className="mt-3 line-clamp-2 font-secondary text-sm text-muted-foreground">
              {member.skills.slice(0, 6).join(" · ")}
            </p>
          ) : null}

          <div className="mt-4">
            <ContributionBadges badges={member.badges} />
          </div>

          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-secondary text-sm">
            <div className="flex items-center gap-2">
              <BriefcaseBusiness
                aria-hidden="true"
                className="size-4 text-muted-foreground"
              />
              <dt className="sr-only">Jobs shared</dt>
              <dd>{member.jobsShared} shared</dd>
            </div>
            <div className="flex items-center gap-2">
              <Search
                aria-hidden="true"
                className="size-4 text-muted-foreground"
              />
              <dt className="sr-only">Jobs saved by members</dt>
              <dd>{member.jobsSavedByMembers} useful saves</dd>
            </div>
            <div className="flex items-center gap-2">
              <Handshake
                aria-hidden="true"
                className="size-4 text-muted-foreground"
              />
              <dt className="sr-only">Referrals completed</dt>
              <dd>{member.referralsCompleted} referrals</dd>
            </div>
          </dl>
        </div>
      </div>
    </article>
  );
}

export function PeopleDirectory({
  filter,
  groupSlug,
  members,
  query,
}: Readonly<{
  filter: PeopleDirectoryFilter;
  groupSlug: string;
  members: GroupMemberDirectoryItem[];
  query: string;
}>) {
  return (
    <div className="max-w-4xl">
      <header>
        <p className="font-secondary text-sm font-bold uppercase text-brand">
          Jobs & Referrals
        </p>
        <h2 className="mt-2 text-4xl font-bold">People</h2>
        <p className="mt-2 max-w-2xl font-secondary leading-7 text-muted-foreground">
          Find members by their visible experience and the help they have given
          this group.
        </p>
      </header>

      <section aria-label="Find members" className="mt-8 border-t pt-7">
        <form className="flex flex-col gap-3 sm:flex-row" method="get">
          <input name="filter" type="hidden" value={filter} />
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground"
            />
            <Input
              aria-label="Search members"
              className="pl-10"
              defaultValue={query}
              maxLength={100}
              name="q"
              placeholder="Search people, roles, or visible skills"
              type="search"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>

        <nav aria-label="People filters" className="mt-4">
          <ul className="grid w-full grid-cols-1 rounded-md border border-border bg-secondary p-1 sm:inline-grid sm:w-auto sm:grid-cols-3">
            {peopleDirectoryFilters.map((option) => (
              <li key={option}>
                <Link
                  aria-current={option === filter ? "page" : undefined}
                  className={cn(
                    "block min-h-9 rounded-sm px-3 py-2 text-center text-sm font-semibold text-muted-foreground",
                    option === filter && "bg-surface text-foreground shadow-xs",
                  )}
                  href={filterHref(groupSlug, option, query)}
                >
                  {peopleDirectoryFilterLabels[option]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </section>

      <section aria-labelledby="people-results-heading" className="mt-9">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-2xl font-bold" id="people-results-heading">
            Members
          </h3>
          <p className="font-secondary text-sm text-muted-foreground">
            {members.length} {members.length === 1 ? "person" : "people"}
          </p>
        </div>

        {members.length ? (
          <div className="mt-4">
            {members.map((member) => (
              <MemberCard
                groupSlug={groupSlug}
                key={member.userId}
                member={member}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            className="mt-5"
            description="Try a different name, role, visible skill, or contribution filter."
            icon={Users}
            title="No members found"
          />
        )}
      </section>
    </div>
  );
}
