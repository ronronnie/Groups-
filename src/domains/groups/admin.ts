import { z } from "zod";
import { groupNameSchema } from "@/domains/groups/validation";

export const groupSettingsSchema = z.object({
  invitesEnabled: z.boolean().default(true),
  allowMemberInvites: z.boolean().default(false),
  defaultProfileVisibility: z.enum(["members", "private"]).default("members"),
  jobNotificationsDefault: z.boolean().default(true),
  groupNotificationsDefault: z.boolean().default(true),
  digestCadenceDefault: z.enum(["off", "daily", "weekly"]).default("weekly"),
});
export type GroupSettings = z.infer<typeof groupSettingsSchema>;
export const updateGroupSettingsSchema = z
  .object({
    groupId: z.string().uuid(),
    name: groupNameSchema,
    settings: groupSettingsSchema.strict(),
  })
  .strict();
export const roleChangeSchema = z.object({
  groupId: z.string().uuid(),
  memberId: z.string().uuid(),
  role: z.enum(["admin", "member"]),
});
export const contentTargetSchema = z.object({
  groupId: z.string().uuid(),
  targetId: z.string().uuid(),
  targetType: z.enum(["job_share", "message"]),
});
export const reportReasons = ["off_topic", "spam", "harmful", "other"] as const;
export const reportReasonLabels = {
  off_topic: "Off-topic",
  spam: "Spam",
  harmful: "Harmful or misleading",
  other: "Other",
};
export const reportContentSchema = contentTargetSchema.extend({
  reason: z.enum(reportReasons),
  details: z.string().trim().max(500).default(""),
});
export const moderateContentSchema = contentTargetSchema.extend({
  hidden: z.boolean(),
  reason: z.string().trim().min(3).max(300),
});

export function canManageMember(
  actor: "owner" | "admin" | "member",
  target: "owner" | "admin" | "member",
  sameUser: boolean,
) {
  return (
    !sameUser &&
    target !== "owner" &&
    (actor === "owner" || (actor === "admin" && target === "member"))
  );
}
