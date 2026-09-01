import { ArrowRight, Clock3, LogIn, Users } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSignInUrl } from "@/server/auth/guards";
import { getCurrentUser } from "@/server/auth/current-user";
import { acceptInviteAction } from "@/server/groups/actions";
import { createGroupSqlExecutor } from "@/server/groups/database";
import { getInvitePreview } from "@/server/groups/service";

const unavailableMessages = {
  exhausted: "This invite link has reached its join limit.",
  expired: "This invite link has expired.",
  revoked: "This invite link was revoked by a group admin.",
} as const;

export default async function JoinInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const [preview, user] = await Promise.all([
    getInvitePreview(createGroupSqlExecutor(), token),
    getCurrentUser(),
  ]);
  const returnTo = `/join/${encodeURIComponent(token)}`;

  return (
    <main className="min-h-screen px-shell py-8 sm:py-12">
      <div className="mx-auto max-w-xl">
        <Link className="inline-flex" href="/">
          <BrandMark />
        </Link>

        {!preview ? (
          <section className="mt-16 border-t pt-8">
            <h1 className="text-4xl font-bold">Invite not found</h1>
            <p className="mt-3 font-secondary leading-7 text-muted-foreground">
              Check the link or ask the person who invited you for a new one.
            </p>
          </section>
        ) : preview.status !== "active" ? (
          <section className="mt-16 border-t pt-8">
            <StatusBadge tone="danger">Invite unavailable</StatusBadge>
            <h1 className="mt-4 text-4xl font-bold">{preview.groupName}</h1>
            <p className="mt-3 font-secondary leading-7 text-muted-foreground">
              {unavailableMessages[preview.status]}
            </p>
          </section>
        ) : (
          <section className="mt-12 rounded-lg border-2 border-border-strong bg-surface p-6 shadow-pop sm:p-8">
            <StatusBadge tone="info">Jobs & Referrals</StatusBadge>
            <h1 className="mt-5 text-4xl font-bold">{preview.groupName}</h1>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-secondary text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Users aria-hidden="true" className="size-4" />
                {preview.memberCount}{" "}
                {preview.memberCount === 1 ? "member" : "members"}
              </span>
              <span className="flex items-center gap-2">
                <Clock3 aria-hidden="true" className="size-4" />
                Invite expires {preview.expiresAt.toLocaleDateString("en")}
              </span>
            </div>
            <p className="mt-6 font-secondary leading-7 text-muted-foreground">
              Join to share opportunities, discover relevant jobs, and help
              members with referrals.
            </p>

            {query.error === "unavailable" ? (
              <p className="mt-5 text-sm text-destructive" role="alert">
                This invite changed while you were joining. Ask for a new link.
              </p>
            ) : null}

            {user ? (
              <form
                action={acceptInviteAction.bind(null, token)}
                className="mt-8"
              >
                <Button
                  className="w-full"
                  size="lg"
                  type="submit"
                  variant="brand"
                >
                  <ArrowRight aria-hidden="true" className="size-4" />
                  Join group
                </Button>
              </form>
            ) : (
              <div className="mt-8 space-y-3">
                <Button asChild className="w-full" size="lg" variant="brand">
                  <Link href={getSignInUrl(returnTo)}>
                    <LogIn aria-hidden="true" className="size-4" />
                    Sign in to join
                  </Link>
                </Button>
                <p className="text-center font-secondary text-sm text-muted-foreground">
                  New here?{" "}
                  <Link
                    className="font-bold text-foreground underline underline-offset-4"
                    href={`/sign-up?next=${encodeURIComponent(returnTo)}`}
                  >
                    Create an account
                  </Link>
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
