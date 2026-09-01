import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

function Halftone({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ds-halftone", className)} {...props} />;
}

function ComicBurst({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ds-comic-burst", className)} {...props} />;
}

function StickerOutline({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <span className={cn("ds-sticker-outline", className)}>{children}</span>
  );
}

function HighlightMarker({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  return <span className={cn("ds-marker", className)}>{children}</span>;
}

export { ComicBurst, Halftone, HighlightMarker, StickerOutline };
