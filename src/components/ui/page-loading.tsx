import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function PageLoading({ className }: Readonly<{ className?: string }>) {
  return (
    <div
      aria-label="Loading page"
      aria-live="polite"
      className={cn("mx-auto w-full max-w-4xl", className)}
      role="status"
    >
      <span className="sr-only">Loading page</span>
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-4 h-10 w-3/4 max-w-md" />
      <Skeleton className="mt-3 h-5 w-full max-w-xl" />
      <div className="mt-8 grid gap-5">
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    </div>
  );
}

export { PageLoading };
