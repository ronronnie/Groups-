"use client";

import { Check, LoaderCircle, LockKeyhole, Share2 } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { Celebration } from "@/components/motion/celebration";
import { Button } from "@/components/ui/button";
import { outcomeLabels, type OutcomeType } from "@/domains/outcomes/outcome";
import {
  changeOutcomeVisibilityAction,
  recordOutcomeAction,
  type OutcomeActionState,
} from "@/server/outcomes/actions";

const initialState: OutcomeActionState = { status: "idle", message: null };
const checkboxClass = "mt-1 size-4 shrink-0 accent-brand";
const labelClass =
  "flex min-h-10 items-start gap-2 font-secondary text-sm leading-6";

function ActionFeedback({ state }: { state: OutcomeActionState }) {
  return state.message ? (
    <p
      className={`font-secondary text-sm ${state.status === "error" ? "text-destructive" : "text-success-foreground"}`}
      role={state.status === "error" ? "alert" : "status"}
    >
      {state.message}
    </p>
  ) : null;
}

export function RecordOutcomeForm({
  applicationId,
  groupSlug,
  milestones,
}: {
  applicationId: string;
  groupSlug: string;
  milestones: OutcomeType[];
}) {
  const [state, action, pending] = useActionState(
    recordOutcomeAction.bind(null, groupSlug, applicationId),
    initialState,
  );
  if (state.status === "success")
    return (
      <div className="mt-4 space-y-3 border-l-4 border-accent pl-4">
        <Celebration />
        <ActionFeedback state={state} />
        <Button asChild size="sm" variant="outline">
          <Link href={`/app/groups/${groupSlug}/outcomes`}>Review outcome</Link>
        </Button>
      </div>
    );
  return (
    <form action={action} className="mt-4 space-y-3">
      <label className="grid gap-2 font-secondary text-sm font-bold">
        Milestone
        <select
          className="h-10 w-full min-w-0 rounded-md border bg-background px-3 font-normal"
          name="outcomeType"
          required
        >
          {milestones.map((type) => (
            <option key={type} value={type}>
              {outcomeLabels[type]}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        <input className={checkboxClass} name="creditSharer" type="checkbox" />
        The original job sharer helped me.
      </label>
      <label className={labelClass}>
        <input
          className={checkboxClass}
          name="creditReferrer"
          type="checkbox"
        />
        A completed referral in this group helped me.
      </label>
      <label className={labelClass}>
        <input
          className={checkboxClass}
          name="confirmed"
          required
          type="checkbox"
        />
        I confirm this milestone happened to me.
      </label>
      <Button disabled={pending} size="sm" type="submit" variant="outline">
        {pending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <LockKeyhole aria-hidden="true" className="size-4" />
        )}
        {pending ? "Saving" : "Save privately"}
      </Button>
      <ActionFeedback state={state} />
    </form>
  );
}

export function OutcomeSharingForm({
  groupSlug,
  outcomeId,
  shared,
}: {
  groupSlug: string;
  outcomeId: string;
  shared: boolean;
}) {
  const [state, action, pending] = useActionState(
    changeOutcomeVisibilityAction.bind(null, groupSlug, outcomeId),
    initialState,
  );
  return (
    <form action={action} className="mt-4 space-y-3 border-t pt-4">
      <input
        name="visibility"
        type="hidden"
        value={shared ? "private" : "group"}
      />
      {!shared ? (
        <label className={labelClass}>
          <input
            className={checkboxClass}
            name="consent"
            required
            type="checkbox"
          />
          I confirm the attribution above and consent to share my name,
          milestone, job and credited members with this group.
        </label>
      ) : (
        <p className="font-secondary text-sm text-muted-foreground">
          Group members can see this outcome. Making it private cannot undo what
          someone has already seen.
        </p>
      )}
      <Button
        disabled={pending}
        size="sm"
        type="submit"
        variant={shared ? "outline" : "brand"}
      >
        {pending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : shared ? (
          <LockKeyhole aria-hidden="true" className="size-4" />
        ) : (
          <Share2 aria-hidden="true" className="size-4" />
        )}
        {pending ? "Saving" : shared ? "Make private" : "Share with group"}
      </Button>
      {state.status === "success" ? (
        <Check aria-hidden="true" className="size-4 text-success-foreground" />
      ) : null}
      <ActionFeedback state={state} />
    </form>
  );
}
