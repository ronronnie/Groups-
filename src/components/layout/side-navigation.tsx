import Link from "next/link";
import type { NavigationItem } from "@/components/layout/navigation-types";
import { cn } from "@/lib/utils";

function SideNavigation({
  activeHref,
  className,
  items,
}: Readonly<{
  activeHref: string;
  className?: string;
  items: NavigationItem[];
}>) {
  return (
    <aside
      aria-label="Group navigation"
      className={cn(
        "w-60 shrink-0 border-r border-border bg-surface-subtle px-3 py-5",
        className,
      )}
    >
      <nav>
        <ul className="space-y-1">
          {items.map(({ href, icon: Icon, label }) => {
            const active =
              activeHref === href || activeHref.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                    active &&
                      "border border-border-strong bg-accent text-accent-foreground shadow-[2px_2px_0_var(--border-strong)]",
                  )}
                  href={href}
                >
                  <Icon aria-hidden="true" className="size-5 shrink-0" />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

export { SideNavigation };
