import { Button } from "@/components/ui/button";
import type { NotificationPreferences } from "@/domains/notifications/events";
import { updateNotificationPreferencesAction } from "@/server/notifications/actions";

const choices = [
  {
    name: "strongMatchesEnabled",
    label: "Strong job matches",
    description: "New roles that strongly match your career profile.",
  },
  {
    name: "referralRequestsEnabled",
    label: "Referral requests",
    description:
      "Requests you receive and updates to requests you are part of.",
  },
  {
    name: "applicationRemindersEnabled",
    label: "Application follow-ups",
    description: "Private reminders based on dates in your tracker.",
  },
  {
    name: "jobActivityEnabled",
    label: "Useful job activity",
    description: "Saved shares and saved roles that may close soon.",
  },
  {
    name: "groupActivityEnabled",
    label: "Group activity",
    description: "Invite acceptances and consented outcomes.",
  },
] as const;

export function NotificationPreferencesForm({
  preferences,
}: {
  preferences: NotificationPreferences;
}) {
  return (
    <form action={updateNotificationPreferencesAction} className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="text-xl font-bold">In-app notifications</legend>
        <label className="flex items-start gap-3 border-b py-4">
          <input
            className="mt-1 size-4 accent-primary"
            defaultChecked={preferences.inAppEnabled}
            name="inAppEnabled"
            type="checkbox"
          />
          <span>
            <span className="block font-bold">Allow notifications</span>
            <span className="font-secondary mt-1 block text-sm leading-6 text-muted-foreground">
              Turn off all in-app notifications while keeping your individual
              choices below.
            </span>
          </span>
        </label>
        {choices.map((choice) => (
          <label className="flex items-start gap-3 py-2" key={choice.name}>
            <input
              className="mt-1 size-4 accent-primary"
              defaultChecked={preferences[choice.name]}
              name={choice.name}
              type="checkbox"
            />
            <span>
              <span className="block font-bold">{choice.label}</span>
              <span className="font-secondary mt-1 block text-sm leading-6 text-muted-foreground">
                {choice.description}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="space-y-3 border-t pt-6">
        <legend className="text-xl font-bold">Group catch-up cadence</legend>
        <p className="font-secondary text-sm leading-6 text-muted-foreground">
          Choose the default period for recipient-specific catch-ups.
        </p>
        <select
          className="h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm"
          defaultValue={preferences.digestCadence}
          name="digestCadence"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="off">Off</option>
        </select>
      </fieldset>

      <Button type="submit">Save preferences</Button>
    </form>
  );
}
