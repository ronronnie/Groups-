"use server";

import { revalidatePath } from "next/cache";
import {
  createReferralRequestSchema,
  transitionReferralRequestSchema,
} from "@/domains/referrals/workflow";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createReferralSqlExecutor } from "@/server/referrals/database";
import {
  createReferralRequest,
  transitionReferralRequest,
} from "@/server/referrals/service";

export type ReferralActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

function revalidateReferralViews(groupSlug: string, jobId?: string) {
  revalidatePath(`/app/groups/${groupSlug}/referrals`);
  revalidatePath(`/app/groups/${groupSlug}/for-you`);
  if (jobId) revalidatePath(`/app/groups/${groupSlug}/jobs/${jobId}`);
}

export async function createReferralRequestAction(
  groupSlug: string,
  _previousState: ReferralActionState,
  formData: FormData,
): Promise<ReferralActionState> {
  const user = await requireCurrentUser("/app");
  const parsed = createReferralRequestSchema.safeParse({
    groupId: formData.get("groupId"),
    jobId: formData.get("jobId"),
    potentialReferrerId: formData.get("potentialReferrerId"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Write a referral request of at least 20 characters.",
    };
  }

  const created = await createReferralRequest(createReferralSqlExecutor(), {
    ...parsed.data,
    requesterId: user.id,
  });
  if (!created) {
    return {
      status: "error",
      message: "This request is unavailable or already active.",
    };
  }

  revalidateReferralViews(groupSlug, parsed.data.jobId);
  return { status: "success", message: "Referral request sent privately." };
}

export async function transitionReferralRequestAction(
  groupSlug: string,
  requestId: string,
  formData: FormData,
) {
  const user = await requireCurrentUser("/app");
  const parsed = transitionReferralRequestSchema.parse({
    groupId: formData.get("groupId"),
    requestId,
    nextState: formData.get("nextState"),
    note: formData.get("note") ?? "",
  });
  const updated = await transitionReferralRequest(createReferralSqlExecutor(), {
    ...parsed,
    userId: user.id,
  });
  if (!updated) throw new Error("This referral action is not available.");
  revalidateReferralViews(groupSlug);
}
