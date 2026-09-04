"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  digestCadenceSchema,
  notificationPreferencesSchema,
} from "@/domains/notifications/events";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createNotificationSqlExecutor } from "@/server/notifications/database";
import {
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
} from "@/server/notifications/service";

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

export async function updateNotificationPreferencesAction(formData: FormData) {
  const user = await requireCurrentUser("/app/settings/notifications");
  const preferences = notificationPreferencesSchema.parse({
    inAppEnabled: checked(formData, "inAppEnabled"),
    strongMatchesEnabled: checked(formData, "strongMatchesEnabled"),
    referralRequestsEnabled: checked(formData, "referralRequestsEnabled"),
    applicationRemindersEnabled: checked(
      formData,
      "applicationRemindersEnabled",
    ),
    jobActivityEnabled: checked(formData, "jobActivityEnabled"),
    groupActivityEnabled: checked(formData, "groupActivityEnabled"),
    digestCadence: digestCadenceSchema.parse(formData.get("digestCadence")),
  });

  await updateNotificationPreferences(
    createNotificationSqlExecutor(),
    user.id,
    preferences,
  );
  revalidatePath("/app", "layout");
  redirect("/app/settings/notifications?saved=1");
}

export async function markNotificationReadAction(notificationId: string) {
  const user = await requireCurrentUser("/app/notifications");
  await markNotificationRead(createNotificationSqlExecutor(), {
    userId: user.id,
    notificationId,
  });
  revalidatePath("/app", "layout");
  revalidatePath("/app/notifications");
}

export async function markAllNotificationsReadAction() {
  const user = await requireCurrentUser("/app/notifications");
  await markAllNotificationsRead(createNotificationSqlExecutor(), user.id);
  revalidatePath("/app", "layout");
  revalidatePath("/app/notifications");
}
