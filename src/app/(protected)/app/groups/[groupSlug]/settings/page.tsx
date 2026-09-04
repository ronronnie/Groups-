import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createGroupSqlExecutor } from "@/server/groups/database";
import { getMemberGroupBySlug } from "@/server/groups/service";
import {
  getAdminGroup,
  getModerationQueue,
  listManagedMembers,
} from "@/server/groups/admin-service";
import {
  DismissReportForm,
  GroupSettingsForm,
  MemberControls,
  ModerationControl,
} from "@/features/groups/components/admin-forms";
import { reportReasonLabels } from "@/domains/groups/admin";

export default async function GroupSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupSlug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { groupSlug } = await params;
  const user = await requireCurrentUser(`/app/groups/${groupSlug}/settings`);
  const execute = createGroupSqlExecutor();
  const membership = await getMemberGroupBySlug(execute, groupSlug, user.id);
  if (!membership) notFound();
  const input = { groupId: membership.id, userId: user.id };
  const group = await getAdminGroup(execute, input);
  if (!group) notFound();
  const { tab: requested } = await searchParams;
  const tab =
    requested === "members" || requested === "moderation"
      ? requested
      : "settings";
  const members =
    tab === "members" ? await listManagedMembers(execute, input) : [];
  const queue =
    tab === "moderation" ? await getModerationQueue(execute, input) : null;
  const base = `/app/groups/${groupSlug}`;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h2 className="text-2xl font-bold">Group management</h2>
      <nav
        aria-label="Group management"
        className="flex flex-wrap gap-x-6 gap-y-3 border-b pb-3 text-sm"
      >
        {(
          [
            ["settings", "Settings"],
            ["members", "Members"],
            ["moderation", "Moderation"],
          ] as const
        ).map(([value, label]) => (
          <Link
            className={
              tab === value
                ? "font-bold underline underline-offset-8"
                : "text-muted-foreground"
            }
            key={value}
            href={`${base}/settings?tab=${value}`}
            aria-current={tab === value ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
        <Link href={`${base}/invites`}>Invite links</Link>
      </nav>
      {tab === "settings" && (
        <div className="max-w-xl">
          <GroupSettingsForm
            groupId={group.id}
            name={group.name}
            settings={group.settings}
          />
        </div>
      )}
      {tab === "members" && (
        <section>
          <h3 className="mb-4 text-lg font-bold">Members</h3>
          <ul className="divide-y border-y">
            {members.map((member) => (
              <li className="py-4" key={member.userId}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="break-words font-bold">
                    {member.name}
                    {member.userId === user.id ? " (you)" : ""}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {member.role} · {member.status}
                  </p>
                </div>
                <MemberControls
                  groupId={group.id}
                  actorId={user.id}
                  actorRole={group.role}
                  member={member}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
      {queue && (
        <section className="space-y-6">
          <div>
            <h3 className="text-lg font-bold">Moderation</h3>
            <p className="mt-1 font-secondary text-sm text-muted-foreground">
              Archiving affects this group&apos;s share only. Hidden content can
              be restored.
            </p>
          </div>
          {queue.reports.length > 0 && (
            <div>
              <h4 className="mb-3 font-bold">
                Open reports ({queue.reports.length})
              </h4>
              <ul className="divide-y border-y">
                {queue.reports.map((report) => (
                  <li className="space-y-3 py-4" key={report.id}>
                    <p className="text-sm">
                      <a
                        className="underline"
                        href={`#content-${report.targetId}`}
                      >
                        {reportReasonLabels[
                          report.reason as keyof typeof reportReasonLabels
                        ] ?? report.reason}
                      </a>{" "}
                      · {report.reporterName}
                    </p>
                    {report.details && (
                      <p className="whitespace-pre-wrap break-words font-secondary text-sm">
                        {report.details}
                      </p>
                    )}
                    <DismissReportForm
                      groupId={group.id}
                      reportId={report.id}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <h4 className="font-bold">Reported and recent content</h4>
          {queue.content.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No content to review.
            </p>
          )}
          <ul className="divide-y">
            {queue.content.map((content) => (
              <li
                id={`content-${content.id}`}
                key={content.id}
                className="space-y-3 py-5"
              >
                <h5 className="break-words font-bold">{content.title}</h5>
                <p className="text-sm text-muted-foreground">
                  {content.authorName} · {content.hidden ? "Hidden" : "Visible"}{" "}
                  · {content.reports} open reports
                </p>
                {content.body && (
                  <p className="whitespace-pre-wrap break-words font-secondary text-sm">
                    {content.body}
                  </p>
                )}
                <details>
                  <summary className="cursor-pointer py-2 text-sm font-bold">
                    Review content
                  </summary>
                  <div className="max-w-xl py-3">
                    <ModerationControl
                      key={`${content.id}-${content.hidden}`}
                      groupId={group.id}
                      content={content}
                    />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
