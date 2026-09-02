"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

export function FeedActionButton({
  children,
  pendingLabel,
  ...props
}: ButtonProps & { pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <Button aria-disabled={pending} disabled={pending} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
