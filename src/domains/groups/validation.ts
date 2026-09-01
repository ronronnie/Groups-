import { z } from "zod";
import { groupEngineKeySchema } from "@/domains/groups/group-engine";

export const groupNameSchema = z
  .string()
  .trim()
  .min(2, "Group name must be at least 2 characters.")
  .max(80, "Group name must be 80 characters or fewer.");

export const createGroupInputSchema = z.object({
  name: groupNameSchema,
  engineKey: groupEngineKeySchema,
});

export const createInviteInputSchema = z.object({
  groupId: z.string().uuid(),
  expiresAt: z.date(),
  maxUses: z.number().int().min(1).max(1_000).nullable(),
});

export const inviteTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, "Invite token is invalid.");

export type CreateGroupInput = z.infer<typeof createGroupInputSchema>;
export type CreateInviteInput = z.infer<typeof createInviteInputSchema>;
