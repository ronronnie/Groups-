import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProfileCompleteness({
  className,
  value,
}: Readonly<{ className?: string; value: number }>) {
  const safeValue = Math.min(100, Math.max(0, value));
  const complete = safeValue === 100;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-4 font-secondary text-sm">
        <span className="font-bold">Profile completeness</span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {complete ? (
            <CheckCircle2 aria-hidden="true" className="size-4 text-success" />
          ) : null}
          {safeValue}%
        </span>
      </div>
      <div
        aria-label={`Profile ${safeValue}% complete`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={safeValue}
        className="h-2 overflow-hidden rounded-sm bg-secondary"
        role="progressbar"
      >
        <div
          className="h-full bg-success transition-[width] duration-[var(--motion-slow)]"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}
