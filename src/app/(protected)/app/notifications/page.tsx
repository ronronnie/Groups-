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
      <header className="mb-8 flex items-end justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-4xl font-bold">Notifications</h1>
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
