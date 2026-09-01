import type { HTMLAttributes } from "react";
import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex min-h-6 items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-semibold",
  {
    variants: {
      tone: {
        neutral: "bg-secondary text-secondary-foreground",
        success: "bg-success/20 text-success-foreground",
        warning: "bg-warning/35 text-warning-foreground",
        info: "bg-info/25 text-info-foreground",
        danger: "bg-destructive/15 text-destructive",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

interface StatusBadgeProps
  extends
    HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {}

function StatusBadge({ className, tone, ...props }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ tone }), className)} {...props} />
  );
}

function StickerBadge({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex rotate-[-2deg] items-center rounded-sm border-2 border-border-strong bg-accent px-2.5 py-1 text-sm font-bold text-accent-foreground shadow-pop",
        className,
      )}
      {...props}
    />
  );
}

export { StatusBadge, StickerBadge, statusBadgeVariants };
