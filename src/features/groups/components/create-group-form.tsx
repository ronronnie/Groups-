"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  GraduationCap,
  LoaderCircle,
  Plane,
} from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createGroupAction } from "@/server/groups/actions";

const initialState = { error: null as string | null };

export function CreateGroupForm() {
  const [state, formAction, pending] = useActionState(
    createGroupAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-8">
      <fieldset className="space-y-3">
        <legend className="font-secondary text-sm font-bold">Group type</legend>
        <label className="flex cursor-pointer items-start gap-4 rounded-lg border-2 border-border-strong bg-surface p-4 shadow-pop">
          <input
            className="mt-1 size-4 accent-[var(--brand)]"
            defaultChecked
            name="engineKey"
            type="radio"
            value="jobs"
          />
          <BriefcaseBusiness aria-hidden="true" className="mt-0.5 size-6" />
          <span className="min-w-0">
            <span className="block font-bold">Jobs & Referrals</span>
            <span className="mt-1 block font-secondary text-sm leading-6 text-muted-foreground">
              Share jobs, discover matches, track applications, and help each
              other with referrals.
            </span>
          </span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <div
            aria-disabled="true"
            className="flex items-center gap-3 rounded-lg border bg-surface-subtle p-4 text-muted-foreground"
          >
            <Plane aria-hidden="true" className="size-5" />
            <span>
              <span className="block font-bold">Travel</span>
              <span className="font-secondary text-xs">Coming soon</span>
            </span>
          </div>
          <div
            aria-disabled="true"
            className="flex items-center gap-3 rounded-lg border bg-surface-subtle p-4 text-muted-foreground"
          >
            <GraduationCap aria-hidden="true" className="size-5" />
            <span>
              <span className="block font-bold">Alumni</span>
              <span className="font-secondary text-xs">Coming soon</span>
            </span>
          </div>
        </div>
      </fieldset>

      <div className="space-y-2">
        <label className="font-secondary text-sm font-bold" htmlFor="name">
          Group name
        </label>
        <Input
          autoComplete="off"
          id="name"
          maxLength={80}
          minLength={2}
          name="name"
          placeholder="Design jobs in Bengaluru"
          required
        />
        <p className="font-secondary text-xs text-muted-foreground">
          You can invite people immediately. Career details come later.
        </p>
      </div>

      {state.error ? (
        <p aria-live="polite" className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button
        className="w-full sm:w-auto"
        disabled={pending}
        size="lg"
        type="submit"
        variant="brand"
      >
        {pending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <ArrowRight aria-hidden="true" className="size-4" />
        )}
        Create group
      </Button>
    </form>
  );
}
