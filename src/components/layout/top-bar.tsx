import { Bell } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { CommandSearch } from "@/components/ui/command-search";
import { Tooltip } from "@/components/ui/tooltip";
import { UserChip } from "@/components/ui/user-chip";
import { cn } from "@/lib/utils";

function TopBar({ className }: Readonly<{ className?: string }>) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur",
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-[100rem] items-center gap-2 px-3 sm:gap-3 sm:px-5">
        <Link className="mr-auto shrink-0" href="/">
          <BrandMark />
        </Link>
        <CommandSearch className="w-10 px-0 sm:w-64 sm:justify-start sm:px-3" />
        <Tooltip content="Notifications">
          <button
            aria-label="Notifications"
            className="grid size-10 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            type="button"
          >
            <Bell aria-hidden="true" className="size-5" />
          </button>
        </Tooltip>
        <UserChip
          className="hidden max-w-48 sm:inline-flex"
          detail="Design community"
          name="Maya Chen"
        />
        <UserChip
          className="border-0 bg-transparent p-0 sm:hidden"
          name="Maya Chen"
        />
      </div>
    </header>
  );
}

export { TopBar };
