"use client";

import { Toaster as Sonner, toast } from "sonner";

function Toaster() {
  return (
    <Sonner
      closeButton
      position="bottom-right"
      toastOptions={{
        classNames: {
          actionButton: "!bg-primary !text-primary-foreground",
          closeButton: "!border-border !bg-surface !text-foreground",
          description: "!font-secondary !text-muted-foreground",
          toast:
            "!rounded-lg !border-2 !border-border-strong !bg-surface !text-foreground !shadow-pop",
        },
      }}
    />
  );
}

export { Toaster, toast };
