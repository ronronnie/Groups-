import { MessageCircle } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/states";
import { DiscussionForm } from "@/features/jobs/components/discussion-form";
import type { JobDiscussionMessage } from "@/server/jobs/discussion-service";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function JobDiscussion({
  groupId,
  groupSlug,
  jobId,
  messages,
}: Readonly<{
  groupId: string;
  groupSlug: string;
  jobId: string;
  messages: JobDiscussionMessage[];
}>) {
  return (
    <section
      aria-labelledby="discussion-heading"
      className="mt-10 border-t pt-8"
      id="discussion"
    >
      <div className="flex items-center gap-3">
        <MessageCircle aria-hidden="true" className="size-5" />
        <h3 className="text-2xl font-bold" id="discussion-heading">
          Job discussion
        </h3>
      </div>
      <p className="mt-2 max-w-2xl font-secondary text-sm leading-6 text-muted-foreground">
        Keep questions about this role attached to the job. Only active group
        members can read or post here.
      </p>

      {messages.length ? (
        <ol className="mt-6 divide-y border-y">
          {messages.map((message) => (
            <li className="flex gap-3 py-5" key={message.id}>
              <Avatar alt={message.authorName} className="size-9" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-bold">{message.authorName}</p>
                  <time
                    className="font-secondary text-xs text-muted-foreground"
                    dateTime={message.createdAt.toISOString()}
                  >
                    {dateFormatter.format(message.createdAt)}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words font-secondary text-sm leading-6">
                  {message.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          className="mt-6 min-h-44"
          description="Questions and useful context about this role will stay with the job."
          icon={MessageCircle}
          title="No discussion yet"
        />
      )}

      <div id="discussion-composer">
        <DiscussionForm groupId={groupId} groupSlug={groupSlug} jobId={jobId} />
      </div>
    </section>
  );
}
