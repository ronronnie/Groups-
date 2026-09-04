import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/features/notifications/components/notification-center";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createNotificationSqlExecutor } from "@/server/notifications/database";
import {
  createClosingSoonNotifications,
  createDueFollowUpNotifications,
  listNotifications,
} from "@/server/notifications/service";

export default async function NotificationsPage() {
  const user = await requireCurrentUser("/app/notifications");
  const execute = createNotificationSqlExecutor();

  await Promise.all([
    createDueFollowUpNotifications(execute, user.id),
    createClosingSoonNotifications(execute, user.id),
  ]);
  const notifications = await listNotifications(execute, user.id);

  return (
    <main className="mx-auto max-w-4xl px-shell py-section">
      <header className="mb-8 flex flex-col items-start justify-between gap-4 border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Notifications</h1>
          <p className="font-secondary mt-2 text-sm text-muted-foreground">
            Matches, requests, and reminders that help you act.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/app/settings/notifications">Preferences</Link>
        </Button>
      </header>
      <NotificationCenter notifications={notifications} />
    </main>
  );
}
