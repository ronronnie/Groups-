"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  outcomeVisibilitySchema,
  recordOutcomeSchema,
} from "@/domains/outcomes/outcome";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createGroupSqlExecutor } from "@/server/groups/database";
import { getMemberGroupBySlug } from "@/server/groups/service";
import { createOutcomeSqlExecutor } from "@/server/outcomes/database";
import {
  recordPrivateOutcome,
  setOutcomeVisibility,
} from "@/server/outcomes/service";

export type OutcomeActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

function refresh(groupSlug: string) {
  revalidatePath(`/app/groups/${groupSlug}`, "layout");
}

export async function recordOutcomeAction(
  groupSlug: string,
  applicationId: string,
  _state: OutcomeActionState,
  formData: FormData,
): Promise<OutcomeActionState> {
  const user = await requireCurrentUser("/app");
  try {
    const slug = z.string().trim().min(1).max(160).parse(groupSlug);
    const group = await getMemberGroupBySlug(
      createGroupSqlExecutor(),
      slug,
      user.id,
    );
    if (!group)
      return {
        status: "error",
        message: "This group is not available to you.",
      };
    const input = recordOutcomeSchema.safeParse({
      groupId: group.id,
      applicationId,
      outcomeType: formData.get("outcomeType"),
      confirmed: formData.get("confirmed") === "on",
      creditSharer: formData.get("creditSharer") === "on",
      creditReferrer: formData.get("creditReferrer") === "on",
    });
    if (!input.success)
      return {
        status: "error",
        message: "Choose a milestone and confirm it happened.",
      };
    const result = await recordPrivateOutcome(createOutcomeSqlExecutor(), {
      ...input.data,
      userId: user.id,
    });
    if (!result)
      return {
        status: "error",
        message:
          "This milestone is already recorded or does not match your tracker history.",
      };
    refresh(group.slug);
    return {
      status: "success",
      message: "Milestone saved privately. Nothing was announced.",
    };
  } catch {
    return {
      status: "error",
      message: "Could not save your milestone. Try again.",
    };
  }
}

export async function changeOutcomeVisibilityAction(
  groupSlug: string,
  outcomeId: string,
  _state: OutcomeActionState,
  formData: FormData,
): Promise<OutcomeActionState> {
  const user = await requireCurrentUser("/app");
  try {
    const slug = z.string().trim().min(1).max(160).parse(groupSlug);
    const group = await getMemberGroupBySlug(
      createGroupSqlExecutor(),
      slug,
      user.id,
    );
    if (!group)
      return {
        status: "error",
        message: "This group is not available to you.",
      };
    const input = outcomeVisibilitySchema.safeParse({
      groupId: group.id,
      outcomeId,
      visibility: formData.get("visibility"),
      consent: formData.get("consent") === "on",
    });
    if (!input.success)
      return {
        status: "error",
        message: "Your explicit consent is required before sharing.",
      };
    const result = await setOutcomeVisibility(createOutcomeSqlExecutor(), {
      ...input.data,
      userId: user.id,
    });
    if (!result)
      return {
        status: "error",
        message: "This outcome is not available to you.",
      };
    refresh(group.slug);
    return {
      status: "success",
      message:
        input.data.visibility === "group"
          ? "Outcome shared with this group."
          : "Outcome is private again. Group credit has been withdrawn.",
    };
  } catch {
    return { status: "error", message: "Could not change sharing. Try again." };
  }
}
