"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import * as React from "react";
import { cn } from "@/lib/utils";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

interface AvatarProps extends React.ComponentProps<
  typeof AvatarPrimitive.Root
> {
  alt: string;
  src?: string;
}

function Avatar({ alt, className, src, ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        "relative inline-flex size-10 shrink-0 overflow-hidden rounded-full border border-border-strong bg-accent",
        className,
      )}
      {...props}
    >
      <AvatarPrimitive.Image
        alt={alt}
        className="size-full object-cover"
        src={src}
      />
      <AvatarPrimitive.Fallback
        className="grid size-full place-items-center text-sm font-bold"
        delayMs={src ? 300 : 0}
      >
        {getInitials(alt)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

export { Avatar };
