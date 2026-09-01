"use server";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createGroupInputSchema } from "@/domains/groups/validation";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createGroupSqlExecutor } from "@/server/groups/database";
import {
  acceptGroupInvite,
  createGroupInvite,
  createGroupWithInvite,
  revokeGroupInvite,
} from "@/server/groups/service";

type GroupActionState = { error: string | null };

const createInviteFormSchema = z.object({
  expiresInDays: z.coerce.number().int().min(1).max(90),
  maxUses: z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.coerce.number().int().min(1).max(1_000).nullable(),
  ),
});

export async function createGroupAction(
  _previousState: GroupActionState,
  formData: FormData,
): Promise<GroupActionState> {
  const user = await requireCurrentUser("/app/groups/new");
  const parsed = createGroupInputSchema.safeParse({
    engineKey: formData.get("engineKey"),
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the group details.",
    };
  }

  let destination: string;
  try {
    const created = await createGroupWithInvite(createGroupSqlExecutor(), {
      ...parsed.data,
      ownerId: user.id,
    });
    destination = `/app/groups/${created.groupSlug}/invites?token=${encodeURIComponent(created.token)}`;
  } catch {
    return { error: "The group could not be created. Please try again." };
  }

  redirect(destination);
}

export async function createInviteAction(groupId: string, formData: FormData) {
  const user = await requireCurrentUser("/app");
  const parsed = createInviteFormSchema.safeParse({
    expiresInDays: formData.get("expiresInDays"),
    maxUses: formData.get("maxUses"),
  });

  if (!z.string().uuid().safeParse(groupId).success || !parsed.success) {
    notFound();
  }

  const expiresAt = new Date(
    Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1_000,
  );
  const created = await createGroupInvite(createGroupSqlExecutor(), {
    expiresAt,
    groupId,
    inviterId: user.id,
    maxUses: parsed.data.maxUses,
  });

  if (!created) {
    notFound();
  }

  redirect(
    `/app/groups/${created.groupSlug}/invites?token=${encodeURIComponent(created.token)}`,
  );
}

export async function revokeInviteAction(groupId: string, inviteId: string) {
  const user = await requireCurrentUser("/app");
  const ids = z
    .object({ groupId: z.string().uuid(), inviteId: z.string().uuid() })
    .safeParse({ groupId, inviteId });

  if (!ids.success) {
    notFound();
  }

  const revoked = await revokeGroupInvite(createGroupSqlExecutor(), {
    groupId: ids.data.groupId,
    inviteId: ids.data.inviteId,
    userId: user.id,
  });

  if (!revoked) {
    notFound();
  }
}

export async function acceptInviteAction(token: string) {
  const returnTo = `/join/${encodeURIComponent(token)}`;
  const user = await requireCurrentUser(returnTo);
  const accepted = await acceptGroupInvite(createGroupSqlExecutor(), {
    token,
    userId: user.id,
  });

  if (!accepted) {
    redirect(`${returnTo}?error=unavailable`);
  }

  redirect(`/app/groups/${accepted.groupSlug}`);
}
