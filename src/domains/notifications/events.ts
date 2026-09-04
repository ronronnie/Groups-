import { z } from "zod";

export const notificationEventTypes = [
  "strong_job_match",
  "referral_request_received",
  "referral_request_updated",
  "application_follow_up_reminder",
  "job_saved_by_member",
  "job_likely_closing_soon",
  "outcome_shared",
  "invite_accepted",
  "job_shared",
] as const;

export const notificationCategories = [
  "strong_matches",
  "referrals",
  "application_reminders",
  "job_activity",
  "group_activity",
] as const;

export const digestCadences = ["daily", "weekly", "off"] as const;

export const notificationEventTypeSchema = z.enum(notificationEventTypes);
export const notificationCategorySchema = z.enum(notificationCategories);
export const digestCadenceSchema = z.enum(digestCadences);

export const notificationPreferencesSchema = z.object({
  inAppEnabled: z.boolean(),
  strongMatchesEnabled: z.boolean(),
  referralRequestsEnabled: z.boolean(),
  applicationRemindersEnabled: z.boolean(),
  jobActivityEnabled: z.boolean(),
  groupActivityEnabled: z.boolean(),
  digestCadence: digestCadenceSchema,
});

export const defaultNotificationPreferences = {
  inAppEnabled: true,
  strongMatchesEnabled: true,
  referralRequestsEnabled: true,
  applicationRemindersEnabled: true,
  jobActivityEnabled: true,
  groupActivityEnabled: true,
  digestCadence: "weekly",
} as const satisfies NotificationPreferences;

export type NotificationEventType = z.infer<typeof notificationEventTypeSchema>;
export type NotificationCategory = z.infer<typeof notificationCategorySchema>;
export type DigestCadence = z.infer<typeof digestCadenceSchema>;
export type NotificationPreferences = z.infer<
  typeof notificationPreferencesSchema
>;
