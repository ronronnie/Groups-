"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";

export function CopyInviteLink({ invitePath }: { invitePath: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      const inviteUrl = new URL(invitePath, window.location.origin).toString();
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Invite link copied");
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      toast.error("Could not copy the link");
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Input
        aria-label="Invite link"
        className="font-secondary text-sm"
        readOnly
        value={invitePath}
      />
      <Button className="sm:shrink-0" onClick={copyLink} type="button">
        {copied ? (
          <Check aria-hidden="true" className="size-4" />
        ) : (
          <Copy aria-hidden="true" className="size-4" />
        )}
        {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}
