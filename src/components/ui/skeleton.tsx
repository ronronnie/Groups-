import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("ds-skeleton rounded-sm bg-secondary", className)}
      {...props}
    />
  );
}

export { Skeleton };
