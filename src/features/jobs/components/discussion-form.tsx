"use client";

import { LoaderCircle, Send } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  postJobDiscussionAction,
  type DiscussionActionState,
} from "@/server/jobs/discussion-actions";

const initialState: DiscussionActionState = {
  message: null,
  status: "idle",
};

export function DiscussionForm({
  groupId,
  groupSlug,
  jobId,
}: Readonly<{ groupId: string; groupSlug: string; jobId: string }>) {
  const formRef = useRef<HTMLFormElement>(null);
  const action = postJobDiscussionAction.bind(null, groupId, groupSlug, jobId);
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  return (
    <form action={formAction} className="mt-5" ref={formRef}>
      <label className="font-secondary text-sm font-bold" htmlFor="job-message">
        Add to this discussion
      </label>
      <Textarea
        className="mt-2 min-h-24"
        id="job-message"
        maxLength={2000}
        name="body"
        placeholder="Ask about the role, team, interview, or referral context."
        required
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button disabled={pending} type="submit">
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Send aria-hidden="true" className="size-4" />
          )}
          {pending ? "Posting" : "Post message"}
        </Button>
        {state.message ? (
          <p
            className={
              state.status === "error"
                ? "font-secondary text-sm text-destructive"
                : "font-secondary text-sm text-success-foreground"
            }
            role={state.status === "error" ? "alert" : "status"}
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
