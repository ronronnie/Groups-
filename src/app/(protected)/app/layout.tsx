import Link from "next/link";
import { LogOut, Settings, UserRound } from "lucide-react";
import { connection } from "next/server";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/server/auth/actions";
import { requireCurrentUser } from "@/server/auth/current-user";

export default async function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const user = await requireCurrentUser("/app");

  return (
    <div className="min-h-screen">
      <a
        className="fixed top-2 left-2 z-[100] -translate-y-20 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:translate-y-0"
        href="#main-content"
      >
        Skip to content
      </a>
      <header className="border-b bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-shell">
          <Link href="/app">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="hidden max-w-48 truncate font-secondary text-sm text-muted-foreground sm:inline">
              {user.email}
            </span>
            <Button asChild size="icon" variant="ghost">
              <Link aria-label="Career profile" href="/app/profile">
                <UserRound aria-hidden="true" className="size-4" />
              </Link>
            </Button>
            <Button asChild size="icon" variant="ghost">
              <Link aria-label="Account settings" href="/app/settings/account">
                <Settings aria-hidden="true" className="size-4" />
              </Link>
            </Button>
            <form action={logoutAction}>
              <Button
                aria-label="Log out"
                size="icon"
                type="submit"
                variant="ghost"
              >
                <LogOut aria-hidden="true" className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div id="main-content">{children}</div>
    </div>
  );
}
