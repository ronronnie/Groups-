import {
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  Handshake,
  UserRoundCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import type { NotificationEventType } from "@/domains/notifications/events";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/server/notifications/actions";
import type { NotificationItem } from "@/server/notifications/service";

const icons: Partial<Record<NotificationEventType, LucideIcon>> = {
  strong_job_match: BriefcaseBusiness,
  referral_request_received: Handshake,
  referral_request_updated: Handshake,
  application_follow_up_reminder: CalendarClock,
  job_saved_by_member: UserRoundCheck,
  job_likely_closing_soon: CalendarClock,
  outcome_shared: Users,
  invite_accepted: UserRoundCheck,
};

const formatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function NotificationCenter({
  notifications,
}: {
  notifications: NotificationItem[];
}) {
  const hasUnread = notifications.some((notification) => !notification.readAt);

  if (!notifications.length) {
    return (
      <EmptyState
        description="Strong matches, referral requests, and useful reminders will appear here."
        icon={Bell}
        title="Nothing needs your attention"
      />
    );
  }

  return (
    <div className="space-y-4">
      {hasUnread ? (
        <form action={markAllNotificationsReadAction} className="text-right">
          <Button size="sm" type="submit" variant="outline">
            Mark all as read
          </Button>
        </form>
      ) : null}
      <ol className="divide-y border-y">
        {notifications.map((notification) => {
          const Icon = icons[notification.type] ?? Bell;
          const content = (
            <div className="flex min-w-0 flex-1 gap-4 py-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold">{notification.title}</h2>
                  {!notification.readAt ? (
                    <span
                      aria-label="Unread"
                      className="size-2 rounded-full bg-destructive"
                    />
                  ) : null}
                </div>
                <p className="font-secondary text-sm leading-6 text-muted-foreground">
                  {notification.body}
                </p>
                <p className="font-secondary text-xs text-muted-foreground">
                  {notification.groupName ? `${notification.groupName} · ` : ""}
                  {formatter.format(notification.createdAt)}
                </p>
              </div>
            </div>
          );

          return (
            <li
              className={notification.readAt ? "" : "bg-surface-subtle"}
              key={notification.id}
            >
              <div className="flex flex-col items-stretch gap-1 px-3 sm:flex-row sm:items-center sm:gap-3 sm:px-4">
                {notification.actionUrl ? (
                  <Link
                    className="min-w-0 flex-1"
                    href={notification.actionUrl}
                  >
                    {content}
                  </Link>
                ) : (
                  content
                )}
                {!notification.readAt ? (
                  <form
                    className="self-end pb-3 sm:self-auto sm:pb-0"
                    action={markNotificationReadAction.bind(
                      null,
                      notification.id,
                    )}
                  >
                    <Button size="sm" type="submit" variant="ghost">
                      Mark read
                    </Button>
                  </form>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
