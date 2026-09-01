import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

function PageHeader({
  actions,
  className,
  description,
  eyebrow,
  title,
}: Readonly<{
  actions?: ReactNode;
  className?: string;
  description?: string;
  eyebrow?: string;
  title: string;
}>) {
  return (
    <header
      className={cn(
        "flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="font-secondary mb-2 text-xs font-bold text-brand uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-3xl font-semibold text-balance sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="font-secondary mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

export { PageHeader };
