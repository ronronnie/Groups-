import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function UserChip({
  className,
  detail,
  name,
  src,
}: Readonly<{
  className?: string;
  detail?: string;
  name: string;
  src?: string;
}>) {
  return (
    <div
      className={cn(
        "inline-flex min-w-0 items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1.5 shadow-xs",
        className,
      )}
    >
      <Avatar alt={name} className="size-8" src={src} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{name}</span>
        {detail ? (
          <span className="font-secondary block truncate text-xs text-muted-foreground">
            {detail}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export { UserChip };
