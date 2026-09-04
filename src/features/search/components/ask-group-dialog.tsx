"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ArrowRight,
  BriefcaseBusiness,
  CircleUserRound,
  FileCheck2,
  LoaderCircle,
  MessageSquareText,
  Share2,
  Sparkles,
  Trophy,
  X,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AI_DISPLAY_NAME } from "@/config/brand";
import {
  askGroupQuestionSchema,
  askGroupResponseSchema,
  type AskGroupResponse,
  type AskGroupSourceKind,
} from "@/domains/search/ask-group";

const suggestions = [
  "Show remote roles posted this week",
  "Who might be able to help with a referral?",
  "What jobs did I save but not apply to?",
];

const sourcePresentation: Record<
  AskGroupSourceKind,
  { icon: LucideIcon; label: string }
> = {
  job: { icon: BriefcaseBusiness, label: "Job" },
  job_share: { icon: Share2, label: "Job share" },
  discussion: { icon: MessageSquareText, label: "Discussion" },
  profile: { icon: CircleUserRound, label: "Member" },
  outcome: { icon: FileCheck2, label: "Outcome" },
  reputation: { icon: Trophy, label: "Contribution" },
};

export function AskGroupDialog({
  groupId,
  groupSlug,
}: Readonly<{ groupId: string; groupSlug: string }>) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AskGroupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(nextQuestion = question) {
    const parsedQuestion = askGroupQuestionSchema.safeParse(nextQuestion);
    if (!parsedQuestion.success) {
      setError(
        parsedQuestion.error.issues[0]?.message ?? "Ask a valid question.",
      );
      return;
    }

    setQuestion(parsedQuestion.data);
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/groups/${groupId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: parsedQuestion.data,
          groupSlug,
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof body === "object" && body && "error" in body
            ? String(body.error)
            : "Search is unavailable right now.";
        throw new Error(message);
      }
      const parsedResponse = askGroupResponseSchema.safeParse(body);
      if (!parsedResponse.success) {
        throw new Error("Search returned an unexpected response.");
      }
      setResult(parsedResponse.data);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Search is unavailable right now.",
      );
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask();
  }

  return (
    <DialogPrimitive.Root onOpenChange={setOpen} open={open}>
      <DialogPrimitive.Trigger asChild>
        <Button size="sm" type="button" variant="brand">
          <Sparkles aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">Ask this Group</span>
          <span className="sm:hidden">Ask</span>
        </Button>
      </DialogPrimitive.Trigger>
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
                className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border-2 border-border-strong bg-surface shadow-modal"
                exit={{ opacity: 0, scale: 0.98, y: 8 }}
                initial={{ opacity: 0, scale: 0.98, y: 8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <div className="border-b bg-surface-subtle p-5 pr-16 sm:p-6 sm:pr-16">
                  <DialogPrimitive.Title className="flex items-center gap-2 text-2xl font-bold">
                    <Sparkles
                      aria-hidden="true"
                      className="size-6 text-brand"
                    />
                    Ask this Group
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="font-secondary mt-1 text-sm leading-6 text-muted-foreground">
                    {AI_DISPLAY_NAME} searches this group&apos;s jobs,
                    discussions, visible people, and outcomes.
                  </DialogPrimitive.Description>
                  <DialogPrimitive.Close
                    aria-label="Close"
                    className="absolute top-3 right-3 grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <X aria-hidden="true" className="size-5" />
                  </DialogPrimitive.Close>
                </div>

                <div className="p-5 sm:p-6">
                  <form onSubmit={onSubmit}>
                    <label
                      className="font-secondary text-sm font-bold"
                      htmlFor="ask-group-question"
                    >
                      What do you want to find?
                    </label>
                    <Textarea
                      autoFocus
                      className="mt-2 min-h-24"
                      disabled={loading}
                      id="ask-group-question"
                      maxLength={500}
                      onChange={(event) => setQuestion(event.target.value)}
                      placeholder="Try a role, skill, company, referral, or saved job..."
                      value={question}
                    />
                    <div className="mt-3 flex justify-end">
                      <Button disabled={loading} type="submit">
                        {loading ? (
                          <LoaderCircle
                            aria-hidden="true"
                            className="size-4 animate-spin"
                          />
                        ) : (
                          <Sparkles aria-hidden="true" className="size-4" />
                        )}
                        {loading ? "Searching" : `Ask ${AI_DISPLAY_NAME}`}
                      </Button>
                    </div>
                  </form>

                  {!loading && !result ? (
                    <div className="mt-6 border-t pt-5">
                      <p className="font-secondary text-xs font-bold uppercase text-muted-foreground">
                        Try asking
                      </p>
                      <div className="mt-2 grid gap-2">
                        {suggestions.map((suggestion) => (
                          <button
                            className="font-secondary flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-input px-3 py-2 text-left text-sm hover:border-border-strong hover:bg-secondary"
                            key={suggestion}
                            onClick={() => void ask(suggestion)}
                            type="button"
                          >
                            <span>{suggestion}</span>
                            <ArrowRight
                              aria-hidden="true"
                              className="size-4 shrink-0"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div aria-live="polite">
                    {loading ? (
                      <div className="font-secondary mt-6 flex min-h-28 items-center justify-center gap-3 border-t text-sm text-muted-foreground">
                        <LoaderCircle
                          aria-hidden="true"
                          className="size-5 animate-spin"
                        />
                        Searching this group only...
                      </div>
                    ) : null}

                    {error ? (
                      <p
                        className="font-secondary mt-5 border-l-4 border-destructive bg-destructive/5 p-4 text-sm"
                        role="alert"
                      >
                        {error}
                      </p>
                    ) : null}

                    {result ? (
                      <section className="mt-6 border-t pt-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-secondary text-xs font-bold uppercase text-brand">
                            {AI_DISPLAY_NAME}
                          </p>
                          {result.mode === "fallback" ? (
                            <span className="font-secondary text-xs text-muted-foreground">
                              AI summary unavailable; showing matched results
                            </span>
                          ) : null}
                        </div>
                        <p className="font-secondary mt-2 text-base leading-7">
                          {result.answer}
                        </p>
                        {result.sources.length ? (
                          <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            {result.sources.map((source) => {
                              const presentation =
                                sourcePresentation[source.kind];
                              const Icon = presentation.icon;
                              return (
                                <Link
                                  className="group rounded-md border border-input bg-background p-4 hover:border-border-strong hover:bg-surface-subtle"
                                  href={source.href}
                                  key={source.key}
                                  onClick={() => setOpen(false)}
                                >
                                  <span className="font-secondary flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                                    <Icon
                                      aria-hidden="true"
                                      className="size-4"
                                    />
                                    {presentation.label}
                                  </span>
                                  <strong className="mt-2 block text-base leading-5 group-hover:underline">
                                    {source.title}
                                  </strong>
                                  <span className="font-secondary mt-2 line-clamp-3 block text-sm leading-5 text-muted-foreground">
                                    {source.excerpt}
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        ) : null}
                      </section>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
