import {
  Check,
  CircleHelp,
  Handshake,
  History,
  Inbox,
  LockKeyhole,
  MessageSquareText,
  Send,
  X,
} from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  referralStateLabels,
  type ReferralState,
} from "@/domains/referrals/workflow";
import { FeedActionButton } from "@/features/jobs/components/feed-action-button";
import { transitionReferralRequestAction } from "@/server/referrals/actions";
import type { ReferralRequestItem } from "@/server/referrals/service";

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
const statusTones: Record<
  ReferralState,
  "neutral" | "info" | "warning" | "success" | "danger"
> = {
  requested: "info",
  accepted: "success",
  declined: "danger",
  needs_info: "warning",
  referred: "success",
  closed: "neutral",
};

type ActionOption = {
  state: ReferralState;
  label: string;
  icon: typeof Check;
  variant?: "brand" | "outline" | "ghost" | "destructive";
};

function optionsFor(
  request: ReferralRequestItem,
  perspective: "incoming" | "sent",
) {
  if (perspective === "incoming") {
    if (request.state === "requested") {
      return [
        { state: "accepted", label: "Accept", icon: Check, variant: "brand" },
        {
          state: "needs_info",
          label: "Ask for info",
          icon: CircleHelp,
          variant: "outline",
        },
        { state: "declined", label: "Decline", icon: X, variant: "ghost" },
      ] satisfies ActionOption[];
    }
    if (request.state === "accepted") {
      return [
        {
          state: "referred",
          label: "Mark referred",
          icon: Handshake,
          variant: "brand",
        },
        {
          state: "needs_info",
          label: "Ask for info",
          icon: CircleHelp,
          variant: "outline",
        },
        { state: "declined", label: "Decline", icon: X, variant: "ghost" },
      ] satisfies ActionOption[];
    }
    if (request.state === "needs_info") {
      return [
        { state: "accepted", label: "Accept", icon: Check, variant: "brand" },
        { state: "declined", label: "Decline", icon: X, variant: "ghost" },
      ] satisfies ActionOption[];
    }
    return [];
  }

  if (request.state === "needs_info") {
    return [
      {
        state: "requested",
        label: "Send response",
        icon: Send,
        variant: "brand",
      },
      { state: "closed", label: "Close", icon: X, variant: "ghost" },
    ] satisfies ActionOption[];
  }
  if (["requested", "accepted", "referred"].includes(request.state)) {
    return [
      { state: "closed", label: "Close", icon: X, variant: "ghost" },
    ] satisfies ActionOption[];
  }
  return [];
}

function RequestActions({
  groupId,
  groupSlug,
  perspective,
  request,
}: Readonly<{
  groupId: string;
  groupSlug: string;
  perspective: "incoming" | "sent";
  request: ReferralRequestItem;
}>) {
  const options = optionsFor(request, perspective);
  if (options.length === 0) return null;
  const acceptsNote = request.state === "needs_info" && perspective === "sent";

  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <form
            action={transitionReferralRequestAction.bind(
              null,
              groupSlug,
              request.id,
            )}
            className={
              acceptsNote && option.state === "requested"
                ? "flex min-w-full flex-wrap gap-2"
                : ""
            }
            key={option.state}
          >
            <input name="groupId" type="hidden" value={groupId} />
            <input name="nextState" type="hidden" value={option.state} />
            {acceptsNote && option.state === "requested" ? (
              <Input
                className="min-w-56 flex-1"
                maxLength={600}
                name="note"
                placeholder="Add the requested context"
                required
              />
            ) : null}
            <FeedActionButton
              pendingLabel="Updating"
              size="sm"
              variant={option.variant ?? "outline"}
            >
              <Icon aria-hidden="true" className="size-4" />
              {option.label}
            </FeedActionButton>
          </form>
        );
      })}
    </div>
  );
}

function RequestCard({
  groupId,
  groupSlug,
  perspective,
  request,
}: Readonly<{
  groupId: string;
  groupSlug: string;
  perspective: "incoming" | "sent" | "admin";
  request: ReferralRequestItem;
}>) {
  const otherName =
    perspective === "incoming"
      ? request.requesterName
      : request.potentialReferrerName;
  const context =
    perspective === "incoming"
      ? request.requesterContext
      : request.referrerContext.join(" · ");

  return (
    <article className="rounded-lg border-2 border-border-strong bg-surface p-5 shadow-pop">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-secondary text-xs font-bold uppercase text-brand">
            {request.company}
          </p>
          <h3 className="mt-1 text-xl font-bold">
            <Link
              className="underline-offset-4 hover:underline"
              href={`/app/groups/${groupSlug}/jobs/${request.jobId}`}
            >
              {request.jobTitle}
            </Link>
          </h3>
          <p className="mt-2 font-secondary text-sm">
            {perspective === "incoming"
              ? "From"
              : perspective === "sent"
                ? "To"
                : "Between"}{" "}
            <strong>
              {perspective === "admin"
                ? `${request.requesterName} and ${request.potentialReferrerName}`
                : otherName}
            </strong>
          </p>
          <p className="mt-1 font-secondary text-xs text-muted-foreground">
            {perspective === "admin"
              ? request.referrerContext.join(" · ")
              : context}
          </p>
        </div>
        <StatusBadge tone={statusTones[request.state]}>
          {referralStateLabels[request.state]}
        </StatusBadge>
      </div>

      <blockquote className="mt-4 border-l-4 border-info bg-info/10 px-4 py-3 font-secondary text-sm leading-6">
        {request.message}
      </blockquote>
      <p className="mt-3 flex items-center gap-1.5 font-secondary text-xs text-muted-foreground">
        <LockKeyhole aria-hidden="true" className="size-3.5" />
        Private referral context
      </p>

      {perspective !== "admin" ? (
        <RequestActions
          groupId={groupId}
          groupSlug={groupSlug}
          perspective={perspective}
          request={request}
        />
      ) : null}

      <details className="mt-4 border-t pt-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-secondary text-sm font-bold">
          <History aria-hidden="true" className="size-4" />
          Status history ({request.timeline.length})
        </summary>
        <ol className="mt-3 space-y-3 border-l-2 pl-4 font-secondary text-sm">
          {request.timeline.map((event) => (
            <li key={event.id}>
              <p>
                <strong>{referralStateLabels[event.toState]}</strong> by{" "}
                {event.changedByName}
              </p>
              {event.note ? (
                <p className="mt-1 text-muted-foreground">{event.note}</p>
              ) : null}
              <time
                className="text-xs text-muted-foreground"
                dateTime={event.createdAt.toISOString()}
              >
                {dateFormatter.format(event.createdAt)}
              </time>
            </li>
          ))}
        </ol>
      </details>
    </article>
  );
}

function RequestSection({
  description,
  groupId,
  groupSlug,
  perspective,
  requests,
  title,
}: Readonly<{
  description: string;
  groupId: string;
  groupSlug: string;
  perspective: "incoming" | "sent" | "admin";
  requests: ReferralRequestItem[];
  title: string;
}>) {
  return (
    <section className="border-t pt-7">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mt-1 font-secondary text-sm text-muted-foreground">
        {description}
      </p>
      {requests.length ? (
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {requests.map((request) => (
            <RequestCard
              groupId={groupId}
              groupSlug={groupSlug}
              key={request.id}
              perspective={perspective}
              request={request}
            />
          ))}
        </div>
      ) : (
        <p className="mt-5 flex items-center gap-2 font-secondary text-sm text-muted-foreground">
          {perspective === "incoming" ? (
            <Inbox aria-hidden="true" className="size-4" />
          ) : (
            <MessageSquareText aria-hidden="true" className="size-4" />
          )}
          No requests here.
        </p>
      )}
    </section>
  );
}

export function ReferralInbox({
  groupId,
  groupSlug,
  requests,
  viewerId,
  viewerRole,
}: Readonly<{
  groupId: string;
  groupSlug: string;
  requests: ReferralRequestItem[];
  viewerId: string;
  viewerRole: "owner" | "admin" | "member";
}>) {
  const incoming = requests.filter(
    (request) => request.potentialReferrerId === viewerId,
  );
  const sent = requests.filter((request) => request.requesterId === viewerId);
  const groupRequests = requests.filter(
    (request) =>
      request.requesterId !== viewerId &&
      request.potentialReferrerId !== viewerId,
  );
  const canReviewGroup = viewerRole === "owner" || viewerRole === "admin";

  return (
    <div className="max-w-6xl space-y-10">
      <header>
        <div className="flex items-center gap-3">
          <Handshake aria-hidden="true" className="size-7 text-brand" />
          <h1 className="text-4xl font-bold">Referral requests</h1>
        </div>
        <p className="mt-2 max-w-2xl font-secondary leading-7 text-muted-foreground">
          Coordinate one-to-one referral help without sharing application notes
          or private profile details.
        </p>
      </header>
      <RequestSection
        description="Requests where another member has asked for your help."
        groupId={groupId}
        groupSlug={groupSlug}
        perspective="incoming"
        requests={incoming}
        title="Incoming"
      />
      <RequestSection
        description="Requests you sent to a relevant member."
        groupId={groupId}
        groupSlug={groupSlug}
        perspective="sent"
        requests={sent}
        title="Sent"
      />
      {canReviewGroup && groupRequests.length ? (
        <RequestSection
          description="Admin visibility for group safety. Actions remain with the two participants."
          groupId={groupId}
          groupSlug={groupSlug}
          perspective="admin"
          requests={groupRequests}
          title="Group requests"
        />
      ) : null}
    </div>
  );
}
