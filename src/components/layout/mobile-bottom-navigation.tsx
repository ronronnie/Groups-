import Link from "next/link";
import type { NavigationItem } from "@/components/layout/navigation-types";
import { cn } from "@/lib/utils";

function MobileBottomNavigation({
  activeHref,
  className,
  items,
}: Readonly<{
  activeHref: string;
  className?: string;
  items: NavigationItem[];
}>) {
  return (
    <nav
      aria-label="Mobile group navigation"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur",
        className,
      )}
    >
      <ul className="mx-auto grid h-16 max-w-xl grid-flow-col auto-cols-fr">
        {items.map(({ href, icon: Icon, label }) => {
          const active =
            activeHref === href || activeHref.startsWith(`${href}/`);
          return (
            <li className="min-w-0" key={href}>
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full min-w-0 flex-col items-center justify-center gap-1 rounded-sm px-1 text-[0.6875rem] font-semibold text-muted-foreground",
                  active && "bg-accent/60 text-foreground",
                )}
                href={href}
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                <span className="max-w-full truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export { MobileBottomNavigation };
