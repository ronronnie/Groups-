import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Inbox, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StateProps {
  action?: { label: string; onClick?: () => void };
  className?: string;
  description: string;
  icon?: LucideIcon;
  title: string;
}

function EmptyState({
  action,
  className,
  description,
  icon: Icon = Inbox,
  title,
}: StateProps) {
  return (
    <div
      className={cn(
        "flex min-h-52 flex-col items-center justify-center border border-dashed border-input bg-surface-subtle p-4 text-center sm:p-6",
        className,
      )}
    >
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-accent">
        <Icon aria-hidden="true" className="size-6" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="font-secondary mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action ? (
        <Button className="mt-5" onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

function ErrorState({
  action,
  className,
  description,
  icon: Icon = AlertTriangle,
  title,
}: StateProps) {
  return (
    <div
      className={cn(
        "flex min-h-52 flex-col items-start justify-center border-l-4 border-destructive bg-destructive/5 p-4 sm:p-6",
        className,
      )}
      role="alert"
    >
      <Icon aria-hidden="true" className="mb-4 size-7 text-destructive" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="font-secondary mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action ? (
        <Button className="mt-5" onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

function LoadingState({
  className,
  label = "Loading",
}: Readonly<{ className?: string; label?: ReactNode }>) {
  return (
    <div
      aria-live="polite"
      className={cn(
        "font-secondary flex min-h-36 items-center justify-center gap-3 text-sm text-muted-foreground",
        className,
      )}
      role="status"
    >
      <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

export { EmptyState, ErrorState, LoadingState };
