"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { ArrowUpRight, Search, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AI_DISPLAY_NAME } from "@/config/brand";
import { cn } from "@/lib/utils";

const defaultItems = [
  "Find roles matching my profile",
  "Show recently shared design jobs",
  "Who can help with a referral?",
];

function CommandSearch({
  className,
  items = defaultItems,
}: Readonly<{ className?: string; items?: string[] }>) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <DialogPrimitive.Root onOpenChange={setOpen} open={open}>
      <DialogPrimitive.Trigger asChild>
        <button
          className={cn(
            "font-secondary flex h-10 min-w-0 items-center gap-2 rounded-md border border-input bg-surface px-3 text-sm text-muted-foreground hover:border-border-strong hover:text-foreground",
            className,
          )}
          type="button"
        >
          <Search aria-hidden="true" className="size-4 shrink-0" />
          <span className="hidden truncate sm:inline">Ask this Group</span>
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/50" />
        <DialogPrimitive.Content className="fixed top-[15vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-lg border-2 border-border-strong bg-surface shadow-modal">
          <DialogPrimitive.Title className="sr-only">
            Ask this Group
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search group knowledge with {AI_DISPLAY_NAME}.
          </DialogPrimitive.Description>
          <Command label="Ask this Group">
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Sparkles aria-hidden="true" className="size-5 text-brand-blue" />
              <Command.Input
                autoFocus
                className="font-secondary h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                placeholder={`Ask ${AI_DISPLAY_NAME} about this group...`}
              />
              <DialogPrimitive.Close
                aria-label="Close search"
                className="grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X aria-hidden="true" className="size-5" />
              </DialogPrimitive.Close>
            </div>
            <Command.List className="max-h-80 overflow-y-auto p-2">
              <Command.Empty className="font-secondary p-6 text-center text-sm text-muted-foreground">
                No matching group knowledge yet.
              </Command.Empty>
              <Command.Group heading="Suggestions">
                {items.map((item) => (
                  <Command.Item
                    className="font-secondary flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm outline-none data-[selected=true]:bg-secondary"
                    key={item}
                    onSelect={() => setOpen(false)}
                    value={item}
                  >
                    <span>{item}</span>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export { CommandSearch };
