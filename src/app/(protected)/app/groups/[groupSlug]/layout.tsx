import { Handshake, Settings, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { getGroupEngineNavigation } from "@/domains/groups/registry";
import { GroupNavigationShell } from "@/features/groups/components/group-navigation-shell";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createGroupSqlExecutor } from "@/server/groups/database";
import { getMemberGroupBySlug } from "@/server/groups/service";

export default async function ProtectedGroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ groupSlug: string }>;
}) {
  const { groupSlug } = await params;
  const user = await requireCurrentUser(`/app/groups/${groupSlug}`);
  const group = await getMemberGroupBySlug(
    createGroupSqlExecutor(),
    groupSlug,
    user.id,
  );

  if (!group) {
    notFound();
  }

  const navigation = getGroupEngineNavigation(
    group.engineKey,
    `/app/groups/${group.slug}`,
  );
  const canManageInvites = group.role === "owner" || group.role === "admin";

  return (
    <>
      <section className="border-b bg-surface-subtle px-shell py-5">
        <div className="mx-auto flex max-w-[100rem] flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words text-xl font-bold sm:text-2xl">
                {group.name}
              </h1>
              <StatusBadge tone="info">Jobs & Referrals</StatusBadge>
            </div>
            <p className="mt-1 flex items-center gap-2 font-secondary text-sm text-muted-foreground">
              <Users aria-hidden="true" className="size-4" />
              {group.memberCount}{" "}
              {group.memberCount === 1 ? "member" : "members"}
            </p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0">
            <Button asChild size="sm" variant="outline">
              <Link href={`/app/groups/${group.slug}/referrals`}>
                <Handshake aria-hidden="true" className="size-4" />
                <span className="hidden sm:inline">Referral requests</span>
                <span className="sm:hidden">Referrals</span>
              </Link>
            </Button>
            {canManageInvites ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/app/groups/${group.slug}/invites`}>
                  <Settings aria-hidden="true" className="size-4" />
                  <span className="hidden lg:inline">Manage invites</span>
                  <span className="lg:hidden">Invites</span>
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </section>
      <GroupNavigationShell items={navigation}>{children}</GroupNavigationShell>
    </>
  );
}
