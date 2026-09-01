import { ArrowRight, Plus, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createGroupSqlExecutor } from "@/server/groups/database";
import { listMemberGroups } from "@/server/groups/service";

export default async function ProtectedHomePage() {
  const user = await requireCurrentUser("/app");
  const groups = await listMemberGroups(createGroupSqlExecutor(), user.id);

  return (
    <main className="mx-auto max-w-6xl px-shell py-section">
      <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <div className="max-w-2xl space-y-2">
          <p className="font-secondary text-sm font-bold uppercase text-brand">
            Your groups
          </p>
          <h1 className="text-4xl font-bold sm:text-5xl">
            Turn opportunities into action.
          </h1>
          <p className="font-secondary leading-7 text-muted-foreground">
            Create or join a Jobs & Referrals group to start helping each other.
          </p>
        </div>
        <Button asChild size="lg" variant="brand">
          <Link href="/app/groups/new">
            <Plus aria-hidden="true" className="size-4" />
            Create group
          </Link>
        </Button>
      </div>

      {groups.length ? (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                className="group block h-full rounded-lg border-2 border-border-strong bg-surface p-5 shadow-pop transition-transform hover:-translate-y-0.5"
                href={`/app/groups/${group.slug}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <StatusBadge tone="info">Jobs & Referrals</StatusBadge>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-5 transition-transform group-hover:translate-x-0.5"
                  />
                </div>
                <h2 className="mt-5 text-2xl font-bold">{group.name}</h2>
                <p className="mt-3 flex items-center gap-2 font-secondary text-sm text-muted-foreground">
                  <Users aria-hidden="true" className="size-4" />
                  {group.memberCount}{" "}
                  {group.memberCount === 1 ? "member" : "members"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <section className="mt-10 max-w-xl border-t pt-8">
          <h2 className="text-2xl font-bold">Create your first group</h2>
          <p className="mt-2 font-secondary leading-7 text-muted-foreground">
            Name the group and get one link to invite everyone. No setup maze.
          </p>
        </section>
      )}
    </main>
  );
}
