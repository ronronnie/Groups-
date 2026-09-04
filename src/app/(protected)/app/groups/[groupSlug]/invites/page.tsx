import { Link2, Plus, ShieldCheck, UserPlus, X } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { inviteTokenSchema } from "@/domains/groups/validation";
import { CopyInviteLink } from "@/features/groups/components/copy-invite-link";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createGroupSqlExecutor } from "@/server/groups/database";
import {
  createInviteAction,
  revokeInviteAction,
} from "@/server/groups/actions";
import {
  getInvitePreview,
  getMemberGroupBySlug,
  listManagedInvites,
} from "@/server/groups/service";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function InviteManagementPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ groupSlug }, query] = await Promise.all([params, searchParams]);
  const user = await requireCurrentUser(`/app/groups/${groupSlug}/invites`);
  const execute = createGroupSqlExecutor();
  const group = await getMemberGroupBySlug(execute, groupSlug, user.id);

  if (
    !group ||
    (group.role !== "owner" &&
      group.role !== "admin" &&
      !group.allowMemberInvites)
  ) {
    notFound();
  }

  const invites = await listManagedInvites(execute, group.id, user.id);
  if (!invites) {
    notFound();
  }

  const tokenValue = Array.isArray(query.token) ? query.token[0] : query.token;
  const parsedToken = inviteTokenSchema.safeParse(tokenValue);
  const newInvite = parsedToken.success
    ? await getInvitePreview(execute, parsedToken.data)
    : null;
  const showNewLink =
    newInvite?.groupId === group.id && newInvite.status === "active"
      ? parsedToken.data
      : null;
  const createAction = createInviteAction.bind(null, group.id);

  return (
    <div className="max-w-4xl space-y-10">
      {group.role !== "member" && (
        <Link
          className="text-sm underline"
          href={`/app/groups/${group.slug}/settings`}
        >
          Group management
        </Link>
      )}
      <div className="space-y-2">
        <p className="font-secondary text-sm font-bold uppercase text-brand">
          Group settings
        </p>
        <h2 className="text-3xl font-bold sm:text-4xl">Invite people</h2>
        <p className="max-w-2xl font-secondary leading-7 text-muted-foreground">
          Anyone with an active link can preview this group. They must sign in
          before joining.
        </p>
      </div>

      {showNewLink ? (
        <section className="rounded-lg border-2 border-border-strong bg-accent/30 p-5 shadow-pop sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <Link2 aria-hidden="true" className="mt-0.5 size-5" />
            <div>
              <h3 className="text-xl font-bold">Your new invite link</h3>
              <p className="mt-1 font-secondary text-sm text-muted-foreground">
                Copy it now. For security, the full link is shown only once.
              </p>
            </div>
          </div>
          <CopyInviteLink invitePath={`/join/${showNewLink}`} />
        </section>
      ) : null}

      <section className="border-t pt-8">
        <div className="mb-5 flex items-center gap-3">
          <UserPlus aria-hidden="true" className="size-5" />
          <h3 className="text-2xl font-bold">Create another link</h3>
        </div>
        <form
          action={createAction}
          className="grid gap-4 sm:grid-cols-3 sm:items-end"
        >
          {group.invitesEnabled === false && (
            <p className="text-sm text-muted-foreground sm:col-span-3">
              Invitations are paused in group settings.
            </p>
          )}
          <div className="space-y-2">
            <label
              className="font-secondary text-sm font-bold"
              htmlFor="expiresInDays"
            >
              Expires
            </label>
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
              defaultValue="7"
              id="expiresInDays"
              name="expiresInDays"
            >
              <option value="1">In 1 day</option>
              <option value="7">In 7 days</option>
              <option value="30">In 30 days</option>
              <option value="90">In 90 days</option>
            </select>
          </div>
          <div className="space-y-2">
            <label
              className="font-secondary text-sm font-bold"
              htmlFor="maxUses"
            >
              Maximum joins (optional)
            </label>
            <Input
              id="maxUses"
              inputMode="numeric"
              max={1000}
              min={1}
              name="maxUses"
              placeholder="No limit"
              type="number"
            />
          </div>
          <Button
            type="submit"
            variant="brand"
            disabled={group.invitesEnabled === false}
          >
            <Plus aria-hidden="true" className="size-4" />
            Create link
          </Button>
        </form>
      </section>

      <section className="border-t pt-8">
        <div className="mb-5 flex items-center gap-3">
          <ShieldCheck aria-hidden="true" className="size-5" />
          <h3 className="text-2xl font-bold">Invite links</h3>
        </div>
        <p className="mb-5 font-secondary text-sm text-muted-foreground">
          Existing links cannot be revealed again. Revoke any link you no longer
          trust.
        </p>
        <ul className="divide-y border-y">
          {invites.map((invite) => {
            const revokeAction = revokeInviteAction.bind(
              null,
              group.id,
              invite.id,
            );
            return (
              <li
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                key={invite.id}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      tone={invite.status === "active" ? "success" : "neutral"}
                    >
                      {invite.status}
                    </StatusBadge>
                    <span className="font-secondary text-sm">
                      {invite.useCount}
                      {invite.maxUses === null
                        ? " joins"
                        : ` of ${invite.maxUses} joins`}
                    </span>
                  </div>
                  <p className="mt-2 font-secondary text-xs text-muted-foreground">
                    Expires {formatDate(invite.expiresAt)}
                  </p>
                </div>
                {invite.status === "active" || invite.status === "paused" ? (
                  <form action={revokeAction}>
                    <Button size="sm" type="submit" variant="outline">
                      <X aria-hidden="true" className="size-4" />
                      Revoke
                    </Button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
