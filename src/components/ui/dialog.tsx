"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface OverlayProps {
  description?: string;
  title: string;
  trigger: ReactNode;
}

function CloseButton() {
  return (
    <DialogPrimitive.Close
      aria-label="Close"
      className="absolute top-3 right-3 grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
    >
      <X aria-hidden="true" className="size-5" />
    </DialogPrimitive.Close>
  );
}

function DialogHeading({ description, title }: Omit<OverlayProps, "trigger">) {
  return (
    <div className="pr-10">
      <DialogPrimitive.Title className="text-xl font-semibold">
        {title}
      </DialogPrimitive.Title>
      {description ? (
        <DialogPrimitive.Description className="font-secondary mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </DialogPrimitive.Description>
      ) : null}
    </div>
  );
}

function Modal({
  children,
  description,
  title,
  trigger,
}: OverlayProps & { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <DialogPrimitive.Root onOpenChange={setOpen} open={open}>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-50 bg-foreground/55"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border-2 border-border-strong bg-surface p-5 shadow-modal sm:p-6"
                exit={{ opacity: 0, scale: 0.97, y: 8 }}
                initial={{ opacity: 0, scale: 0.97, y: 8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <DialogHeading description={description} title={title} />
                <div className="mt-5">{children}</div>
                <CloseButton />
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

function Drawer({
  children,
  description,
  side = "right",
  title,
  trigger,
}: OverlayProps & {
  children: ReactNode;
  side?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const fromX = side === "right" ? "100%" : "-100%";

  return (
    <DialogPrimitive.Root onOpenChange={setOpen} open={open}>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-50 bg-foreground/45"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount>
              <motion.aside
                animate={{ x: 0 }}
                className={cn(
                  "fixed inset-y-0 z-50 w-[min(24rem,calc(100%-1rem))] overflow-y-auto border-border-strong bg-surface p-5 shadow-modal sm:p-6",
                  side === "right" ? "right-0 border-l-2" : "left-0 border-r-2",
                )}
                exit={{ x: fromX }}
                initial={{ x: fromX }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <DialogHeading description={description} title={title} />
                <div className="mt-5">{children}</div>
                <CloseButton />
              </motion.aside>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

export { Drawer, Modal };
