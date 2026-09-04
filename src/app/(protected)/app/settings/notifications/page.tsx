import { NotificationPreferencesForm } from "@/features/notifications/components/notification-preferences-form";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createNotificationSqlExecutor } from "@/server/notifications/database";
import { getNotificationPreferences } from "@/server/notifications/service";

export default async function NotificationSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireCurrentUser("/app/settings/notifications");
  const [preferences, query] = await Promise.all([
    getNotificationPreferences(createNotificationSqlExecutor(), user.id),
    searchParams,
  ]);

  return (
    <main className="mx-auto max-w-4xl px-shell py-section">
      <section className="max-w-2xl space-y-8">
        <header className="space-y-2 border-b pb-6">
          <h1 className="text-3xl font-bold sm:text-4xl">
            Notification preferences
          </h1>
          <p className="font-secondary text-sm leading-6 text-muted-foreground">
            Choose the updates that are useful to you. Private tracker and
            profile details are never included in group-wide activity.
          </p>
          {query.saved === "1" ? (
            <p
              className="font-secondary text-sm font-bold text-success-foreground"
              role="status"
            >
              Preferences saved.
            </p>
          ) : null}
        </header>
        <NotificationPreferencesForm preferences={preferences} />
      </section>
    </main>
  );
}
