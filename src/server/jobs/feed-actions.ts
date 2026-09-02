"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createJobSqlExecutor } from "@/server/jobs/database";
import {
  markJobApplied,
  setJobDismissed,
  setJobSaved,
} from "@/server/jobs/feed-service";

const actionInputSchema = z.object({
  groupId: z.string().uuid(),
  groupSlug: z.string().trim().min(1).max(160),
  jobId: z.string().uuid(),
});

function revalidateJobViews(groupSlug: string, jobId: string) {
  revalidatePath(`/app/groups/${groupSlug}/for-you`);
  revalidatePath(`/app/groups/${groupSlug}/jobs/${jobId}`);
}

export async function setJobSavedAction(
  groupId: string,
  groupSlug: string,
  jobId: string,
  saved: boolean,
) {
  const user = await requireCurrentUser("/app");
  const input = actionInputSchema.parse({ groupId, groupSlug, jobId });
  const updated = await setJobSaved(createJobSqlExecutor(), {
    groupId: input.groupId,
    userId: user.id,
    jobId: input.jobId,
    saved: z.boolean().parse(saved),
  });

  if (!updated) throw new Error("This job is not available in the group.");
  revalidateJobViews(input.groupSlug, input.jobId);
}

export async function setJobDismissedAction(
  groupId: string,
  groupSlug: string,
  jobId: string,
  dismissed: boolean,
) {
  const user = await requireCurrentUser("/app");
  const input = actionInputSchema.parse({ groupId, groupSlug, jobId });
  const updated = await setJobDismissed(createJobSqlExecutor(), {
    groupId: input.groupId,
    userId: user.id,
    jobId: input.jobId,
    dismissed: z.boolean().parse(dismissed),
  });

  if (!updated) throw new Error("This job is not available in the group.");
  revalidateJobViews(input.groupSlug, input.jobId);
}

export async function markJobAppliedAction(
  groupId: string,
  groupSlug: string,
  jobId: string,
) {
  const user = await requireCurrentUser("/app");
  const input = actionInputSchema.parse({ groupId, groupSlug, jobId });
  const updated = await markJobApplied(createJobSqlExecutor(), {
    groupId: input.groupId,
    userId: user.id,
    jobId: input.jobId,
  });

  if (!updated) throw new Error("This job is not available in the group.");
  revalidateJobViews(input.groupSlug, input.jobId);
}
