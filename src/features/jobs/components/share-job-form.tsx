"use client";

import { CheckCircle2, Link2, LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  shareJobAction,
  type ShareJobActionState,
} from "@/server/jobs/actions";

const initialState: ShareJobActionState = {
  message: null,
  status: "idle",
};

export function ShareJobForm({ groupId }: Readonly<{ groupId: string }>) {
  const action = shareJobAction.bind(null, groupId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label className="font-secondary text-sm font-bold" htmlFor="job-url">
          Job URL
        </label>
        <Input
          autoComplete="url"
          id="job-url"
          maxLength={2048}
          name="url"
          placeholder="https://company.com/jobs/product-designer"
          required
          type="url"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label
            className="font-secondary text-sm font-bold"
            htmlFor="job-title"
          >
            Role title <span className="font-normal">(optional)</span>
          </label>
          <Input
            id="job-title"
            maxLength={160}
            name="title"
            placeholder="Senior Product Designer"
          />
        </div>
        <div className="space-y-2">
          <label
            className="font-secondary text-sm font-bold"
            htmlFor="job-company"
          >
            Company <span className="font-normal">(optional)</span>
          </label>
          <Input
            autoComplete="organization"
            id="job-company"
            maxLength={120}
            name="company"
            placeholder="Company name"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label
          className="font-secondary text-sm font-bold"
          htmlFor="share-note"
        >
          Note to the group <span className="font-normal">(optional)</span>
        </label>
        <Textarea
          id="share-note"
          maxLength={1000}
          name="note"
          placeholder="Why this role may be useful, who it could suit, or whether a referral is available."
        />
      </div>

      {state.message ? (
        <p
          aria-live="polite"
          className={
            state.status === "success"
              ? "flex items-center gap-2 font-secondary text-sm text-success-foreground"
              : "font-secondary text-sm text-destructive"
          }
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.status === "success" ? (
            <CheckCircle2 aria-hidden="true" className="size-4" />
          ) : null}
          {state.message}
        </p>
      ) : null}

      <Button disabled={pending} size="lg" type="submit" variant="brand">
        {pending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Link2 aria-hidden="true" className="size-4" />
        )}
        {pending ? "Sharing job" : "Share job"}
      </Button>
    </form>
  );
}
