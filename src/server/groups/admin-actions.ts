"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createGroupSqlExecutor } from "@/server/groups/database";
import {
  changeMemberRole,
  dismissContentReport,
  moderateGroupContent,
  removeGroupMember,
  reportGroupContent,
  updateGroupSettings,
} from "@/server/groups/admin-service";
import {
  moderateContentSchema,
  reportContentSchema,
  roleChangeSchema,
  updateGroupSettingsSchema,
} from "@/domains/groups/admin";

export type AdminActionState = { error: string | null; success: string | null };
const actionSchema = z.discriminatedUnion("action", [
  updateGroupSettingsSchema.extend({ action: z.literal("settings") }),
  roleChangeSchema.extend({ action: z.literal("role") }),
  moderateContentSchema.extend({ action: z.literal("moderate") }),
  reportContentSchema.extend({ action: z.literal("report") }),
  z.object({
    action: z.literal("remove"),
    groupId: z.string().uuid(),
    memberId: z.string().uuid(),
    confirm: z.literal("on"),
  }),
  z.object({
    action: z.literal("dismiss"),
    groupId: z.string().uuid(),
    reportId: z.string().uuid(),
  }),
]);

export async function groupAdminAction(
  _previous: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const user = await requireCurrentUser("/app");
  const input = Object.fromEntries(form.entries());
  // The settings boundary deliberately excludes engine and ownership changes.
  const values =
    input.action === "settings"
      ? actionSchema.safeParse({
          action: "settings",
          groupId: input.groupId,
          name: input.name,
          settings: {
            invitesEnabled: input.invitesEnabled === "on",
            allowMemberInvites: input.allowMemberInvites === "on",
            defaultProfileVisibility: input.defaultProfileVisibility,
            jobNotificationsDefault: input.jobNotificationsDefault === "on",
            groupNotificationsDefault: input.groupNotificationsDefault === "on",
            digestCadenceDefault: input.digestCadenceDefault,
          },
        })
      : actionSchema.safeParse({
          ...input,
          ...(input.action === "moderate"
            ? { hidden: input.hidden === "true" }
            : {}),
        });
  if (!values.success)
    return {
      error: "Check the form fields and any required confirmation.",
      success: null,
    };
  const v = values.data;
  const execute = createGroupSqlExecutor();
  try {
    let changed: { id: string } | null;
    switch (v.action) {
      case "settings":
        changed = await updateGroupSettings(
          execute,
          { groupId: v.groupId, name: v.name, settings: v.settings },
          user.id,
        );
        break;
      case "role":
        changed = await changeMemberRole(execute, { ...v, userId: user.id });
        break;
      case "remove":
        changed = await removeGroupMember(execute, { ...v, userId: user.id });
        break;
      case "moderate":
        changed = await moderateGroupContent(execute, {
          ...v,
          userId: user.id,
        });
        break;
      case "report":
        changed = await reportGroupContent(execute, { ...v, userId: user.id });
        break;
      case "dismiss":
        changed = await dismissContentReport(execute, {
          ...v,
          userId: user.id,
        });
        break;
    }
    if (!changed)
      return {
        error:
          "This action is no longer available, or you do not have permission.",
        success: null,
      };
  } catch {
    return {
      error: "The change could not be saved. Please try again.",
      success: null,
    };
  }
  revalidatePath("/app", "layout");
  return {
    error: null,
    success:
      v.action === "report" ? "Report sent to group admins." : "Changes saved.",
  };
}
