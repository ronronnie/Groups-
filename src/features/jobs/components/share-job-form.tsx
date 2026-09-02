"use client";

import {
  CheckCircle2,
  CopyCheck,
  Link2,
  LoaderCircle,
  SearchCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { useActionState } from "react";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AI_DISPLAY_NAME } from "@/config/brand";
import type { JobExtractionDraft } from "@/domains/jobs/job-extraction";
import type { DuplicateJobMatch } from "@/domains/jobs/job-duplicates";
import {
  prepareJobShareAction,
  shareJobAction,
  type PrepareJobActionState,
  type ShareJobActionState,
} from "@/server/jobs/actions";

const initialPrepareState: PrepareJobActionState = {
  message: null,
  status: "idle",
  draft: null,
  duplicate: null,
};

const initialShareState: ShareJobActionState = {
  message: null,
  status: "idle",
};

const selectClassName =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25";

function FieldLabel({
  children,
  htmlFor,
}: Readonly<{ children: React.ReactNode; htmlFor: string }>) {
  return (
    <label className="font-secondary text-sm font-bold" htmlFor={htmlFor}>
      {children}
    </label>
  );
}

function ReviewJobForm({
  draft,
  duplicate,
  groupId,
}: Readonly<{
  draft: JobExtractionDraft;
  duplicate: DuplicateJobMatch | null;
  groupId: string;
}>) {
  const action = shareJobAction.bind(null, groupId);
  const [state, formAction, pending] = useActionState(
    action,
    initialShareState,
  );
  const needsAttention = draft.outcome !== "success";

  return (
    <section
      aria-labelledby="review-job-heading"
      className="mt-8 border-2 border-border-strong bg-surface p-5 shadow-pop sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {needsAttention ? (
              <TriangleAlert
                aria-hidden="true"
                className="size-5 text-warning-foreground"
              />
            ) : (
              <Sparkles aria-hidden="true" className="size-5 text-brand" />
            )}
            <h4 className="text-2xl font-bold" id="review-job-heading">
              Review job details
            </h4>
          </div>
          <p className="mt-2 font-secondary text-sm text-muted-foreground">
            {needsAttention
              ? `${AI_DISPLAY_NAME} is unsure about some fields. Check them before sharing.`
              : `${AI_DISPLAY_NAME} extracted these details. Check them before sharing.`}
          </p>
        </div>
        <StatusBadge tone={needsAttention ? "warning" : "success"}>
          {Math.round(draft.confidence * 100)}% confidence
        </StatusBadge>
      </div>

      {draft.warnings.length ? (
        <ul className="mt-4 space-y-1 border-l-4 border-warning bg-warning/15 px-4 py-3 font-secondary text-sm text-warning-foreground">
          {draft.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      <form action={formAction} className="mt-6 space-y-5">
        <input name="url" type="hidden" value={draft.url} />

        {duplicate ? (
          <div className="border-l-4 border-brand bg-accent/50 px-4 py-3">
            <div className="flex items-start gap-3">
              <CopyCheck
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-brand"
              />
              <div className="min-w-0">
                <h5 className="font-bold">
                  {duplicate.kind === "exact"
                    ? "This job is already in the group"
                    : "A similar job is already in the group"}
                </h5>
                <p className="mt-1 font-secondary text-sm leading-6 text-muted-foreground">
                  {duplicate.title} at {duplicate.company}
                  {duplicate.location ? `, ${duplicate.location}` : ""}
                </p>
                {duplicate.kind === "exact" ? (
                  <>
                    <input
                      name="reuseJobId"
                      type="hidden"
                      value={duplicate.id}
                    />
                    <p className="mt-2 font-secondary text-sm">
                      Your note and attribution will be added to the existing
                      job.
                    </p>
                  </>
                ) : (
                  <label className="mt-3 flex cursor-pointer items-start gap-2 font-secondary text-sm">
                    <input
                      className="mt-0.5 size-4 accent-brand"
                      defaultChecked
                      name="reuseJobId"
                      type="checkbox"
                      value={duplicate.id}
                    />
                    <span>
                      Use the existing job and add my share attribution
                    </span>
                  </label>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel htmlFor="review-title">Role title</FieldLabel>
            <Input
              defaultValue={draft.title ?? ""}
              id="review-title"
              maxLength={160}
              name="title"
              required
            />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="review-company">Company</FieldLabel>
            <Input
              defaultValue={draft.company ?? ""}
              id="review-company"
              maxLength={120}
              name="company"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="review-summary">Description summary</FieldLabel>
          <Textarea
            className="min-h-24"
            defaultValue={draft.descriptionSummary ?? ""}
            id="review-summary"
            maxLength={1200}
            name="descriptionSummary"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-1">
            <FieldLabel htmlFor="review-location">Location</FieldLabel>
            <Input
              defaultValue={draft.location ?? ""}
              id="review-location"
              maxLength={160}
              name="location"
            />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="review-work-mode">Work mode</FieldLabel>
            <select
              className={selectClassName}
              defaultValue={draft.workMode}
              id="review-work-mode"
              name="workMode"
            >
              <option value="unspecified">Not specified</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="review-employment-type">
              Employment type
            </FieldLabel>
            <select
              className={selectClassName}
              defaultValue={draft.employmentType}
              id="review-employment-type"
              name="employmentType"
            >
              <option value="unspecified">Not specified</option>
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
              <option value="temporary">Temporary</option>
            </select>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <FieldLabel htmlFor="review-experience-min">
              Minimum years
            </FieldLabel>
            <Input
              defaultValue={draft.experienceMin ?? ""}
              id="review-experience-min"
              max={80}
              min={0}
              name="experienceMin"
              type="number"
            />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="review-experience-max">
              Maximum years
            </FieldLabel>
            <Input
              defaultValue={draft.experienceMax ?? ""}
              id="review-experience-max"
              max={80}
              min={0}
              name="experienceMax"
              type="number"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <FieldLabel htmlFor="review-salary">Salary</FieldLabel>
            <Input
              defaultValue={draft.salaryText ?? ""}
              id="review-salary"
              maxLength={160}
              name="salaryText"
              placeholder="e.g. INR 25-35L"
            />
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="review-skills">Skills</FieldLabel>
          <Input
            defaultValue={draft.skills.join(", ")}
            id="review-skills"
            name="skills"
            placeholder="Product design, Figma, Research"
          />
          <p className="font-secondary text-xs text-muted-foreground">
            Separate skills with commas.
          </p>
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="review-note">
            Note to the group <span className="font-normal">(optional)</span>
          </FieldLabel>
          <Textarea
            className="min-h-20"
            defaultValue={draft.note ?? ""}
            id="review-note"
            maxLength={1000}
            name="note"
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

        <Button
          disabled={pending || state.status === "success"}
          size="lg"
          type="submit"
          variant="brand"
        >
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Link2 aria-hidden="true" className="size-4" />
          )}
          {pending ? "Sharing job" : "Share job"}
        </Button>
      </form>
    </section>
  );
}

export function ShareJobForm({ groupId }: Readonly<{ groupId: string }>) {
  const action = prepareJobShareAction.bind(null, groupId);
  const [state, formAction, pending] = useActionState(
    action,
    initialPrepareState,
  );

  return (
    <div>
      <form action={formAction} className="space-y-5">
        <div className="space-y-2">
          <FieldLabel htmlFor="job-url">Job URL</FieldLabel>
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

        <div className="space-y-2">
          <FieldLabel htmlFor="job-text">
            Job description <span className="font-normal">(optional)</span>
          </FieldLabel>
          <Textarea
            id="job-text"
            maxLength={20000}
            name="jobText"
            placeholder="Paste the listing when the link does not contain enough detail."
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel htmlFor="job-title">
              Role title <span className="font-normal">(optional)</span>
            </FieldLabel>
            <Input
              id="job-title"
              maxLength={160}
              name="title"
              placeholder="Senior Product Designer"
            />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="job-company">
              Company <span className="font-normal">(optional)</span>
            </FieldLabel>
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
          <FieldLabel htmlFor="share-note">
            Note to the group <span className="font-normal">(optional)</span>
          </FieldLabel>
          <Textarea
            className="min-h-20"
            id="share-note"
            maxLength={1000}
            name="note"
            placeholder="Why this role may be useful or whether a referral is available."
          />
        </div>

        {state.status === "error" && state.message ? (
          <p className="font-secondary text-sm text-destructive" role="alert">
            {state.message}
          </p>
        ) : null}

        <Button disabled={pending} size="lg" type="submit">
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <SearchCheck aria-hidden="true" className="size-4" />
          )}
          {pending ? `${AI_DISPLAY_NAME} is extracting` : "Review job"}
        </Button>
      </form>

      {state.status === "ready" && state.draft ? (
        <ReviewJobForm
          draft={state.draft}
          duplicate={state.duplicate}
          groupId={groupId}
        />
      ) : null}
    </div>
  );
}
