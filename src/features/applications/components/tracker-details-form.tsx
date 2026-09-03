"use client";

import { Check, LoaderCircle, LockKeyhole } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  updateApplicationDetailsAction,
  type ApplicationDetailsActionState,
} from "@/server/applications/actions";

const initialState: ApplicationDetailsActionState = {
  message: null,
  status: "idle",
};

export function TrackerDetailsForm({
  applicationId,
  groupId,
  groupSlug,
  nextAction,
  nextActionDate,
  privateNotes,
}: Readonly<{
  applicationId: string;
  groupId: string;
  groupSlug: string;
  nextAction: string;
  nextActionDate: string | null;
  privateNotes: string;
}>) {
  const action = updateApplicationDetailsAction.bind(
    null,
    groupId,
    groupSlug,
    applicationId,
  );
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <div className="grid gap-2">
        <label
          className="font-secondary text-xs font-bold uppercase text-muted-foreground"
          htmlFor={`next-action-${applicationId}`}
        >
          Next action
        </label>
        <Input
          defaultValue={nextAction}
          id={`next-action-${applicationId}`}
          maxLength={240}
          name="nextAction"
          placeholder="Follow up with the recruiter"
        />
      </div>
      <div className="grid gap-2">
        <label
          className="font-secondary text-xs font-bold uppercase text-muted-foreground"
          htmlFor={`next-date-${applicationId}`}
        >
          Due date
        </label>
        <Input
          defaultValue={nextActionDate ?? ""}
          id={`next-date-${applicationId}`}
          name="nextActionDate"
          type="date"
        />
      </div>
      <div className="grid gap-2">
        <label
          className="font-secondary flex items-center gap-1.5 text-xs font-bold uppercase text-muted-foreground"
          htmlFor={`private-notes-${applicationId}`}
        >
          <LockKeyhole aria-hidden="true" className="size-3.5" />
          Private notes
        </label>
        <Textarea
          defaultValue={privateNotes}
          id={`private-notes-${applicationId}`}
          maxLength={5_000}
          name="privateNotes"
          placeholder="Interview preparation, contacts, or reminders"
          rows={4}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending} size="sm" type="submit">
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Check aria-hidden="true" className="size-4" />
          )}
          {pending ? "Saving" : "Save details"}
        </Button>
        {state.message ? (
          <p
            className={`font-secondary text-xs ${state.status === "error" ? "text-destructive" : "text-success-foreground"}`}
            role={state.status === "error" ? "alert" : "status"}
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
