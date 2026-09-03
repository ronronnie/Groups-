"use client";

import { Check, LoaderCircle, LockKeyhole, Send } from "lucide-react";
import { useActionState } from "react";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { referralStateLabels } from "@/domains/referrals/workflow";
import {
  createReferralRequestAction,
  type ReferralActionState,
} from "@/server/referrals/actions";
import type { PotentialReferrerOption } from "@/server/referrals/service";

const initialState: ReferralActionState = { status: "idle", message: null };

export function ReferralRequestPanel({
  candidates,
  groupId,
  groupSlug,
  jobId,
}: Readonly<{
  candidates: PotentialReferrerOption[];
  groupId: string;
  groupSlug: string;
  jobId: string;
}>) {
  const [state, action, pending] = useActionState(
    createReferralRequestAction.bind(null, groupSlug),
    initialState,
  );
  const firstAvailable = candidates.find(
    (candidate) => !candidate.existingRequestState,
  );

  if (candidates.length === 0) {
    return (
      <p className="mt-4 border-l-4 border-info bg-info/10 px-4 py-3 font-secondary text-sm">
        No specific referrer is visible yet. Use the job discussion to ask for
        general context.
      </p>
    );
  }

  return (
    <form action={action} className="mt-5 max-w-2xl space-y-5">
      <input name="groupId" type="hidden" value={groupId} />
      <input name="jobId" type="hidden" value={jobId} />
      <fieldset>
        <legend className="font-secondary text-sm font-bold">
          Choose one relevant member
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {candidates.map((candidate) => {
            const unavailable = Boolean(candidate.existingRequestState);
            return (
              <label
                className="flex cursor-pointer gap-3 rounded-md border-2 border-input bg-surface p-4 has-[:checked]:border-brand has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-65"
                key={candidate.userId}
              >
                <input
                  defaultChecked={candidate.userId === firstAvailable?.userId}
                  disabled={unavailable}
                  name="potentialReferrerId"
                  required
                  type="radio"
                  value={candidate.userId}
                />
                <span className="min-w-0">
                  <span className="block font-bold">
                    {candidate.displayName}
                  </span>
                  <span className="mt-1 block font-secondary text-xs leading-5 text-muted-foreground">
                    {candidate.context.join(" · ")}
                  </span>
                  {candidate.existingRequestState ? (
                    <StatusBadge className="mt-2">
                      {referralStateLabels[candidate.existingRequestState]}
                    </StatusBadge>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {firstAvailable ? (
        <>
          <div className="grid gap-2">
            <label
              className="font-secondary text-sm font-bold"
              htmlFor="referral-message"
            >
              Private message
            </label>
            <Textarea
              id="referral-message"
              maxLength={600}
              minLength={20}
              name="message"
              placeholder="Share why you are a fit and ask whether they would be comfortable referring you."
              required
              rows={5}
            />
            <p className="flex items-center gap-1.5 font-secondary text-xs text-muted-foreground">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              Visible only to you, the selected member, and allowed group
              admins.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={pending} type="submit" variant="brand">
              {pending ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              ) : state.status === "success" ? (
                <Check aria-hidden="true" className="size-4" />
              ) : (
                <Send aria-hidden="true" className="size-4" />
              )}
              {pending ? "Sending" : "Request referral"}
            </Button>
            {state.message ? (
              <p
                className={`font-secondary text-sm ${state.status === "error" ? "text-destructive" : "text-success-foreground"}`}
                role={state.status === "error" ? "alert" : "status"}
              >
                {state.message}
              </p>
            ) : null}
          </div>
        </>
      ) : (
        <p className="font-secondary text-sm text-muted-foreground">
          Your active requests for this job are available in the referral inbox.
        </p>
      )}
    </form>
  );
}
