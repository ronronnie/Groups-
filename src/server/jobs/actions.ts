"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { shareJobInputSchema } from "@/domains/jobs/job-sharing";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createJobSqlExecutor } from "@/server/jobs/database";
import { shareJob } from "@/server/jobs/service";

export type ShareJobActionState = {
  message: string | null;
  status: "idle" | "error" | "success";
};

export async function shareJobAction(
  groupId: string,
  _previousState: ShareJobActionState,
  formData: FormData,
): Promise<ShareJobActionState> {
  const user = await requireCurrentUser("/app");
  const validGroupId = z.string().uuid().safeParse(groupId);
  const values = shareJobInputSchema.safeParse({
    url: formData.get("url"),
    title: formData.get("title"),
    company: formData.get("company"),
    note: formData.get("note"),
  });

  if (!validGroupId.success || !values.success) {
    return {
      message:
        values.error?.issues[0]?.message ?? "Check the job details and retry.",
      status: "error",
    };
  }

  try {
    const shared = await shareJob(createJobSqlExecutor(), {
      ...values.data,
      groupId: validGroupId.data,
      sharerId: user.id,
    });

    if (!shared) {
      return {
        message: "You must be an active group member to share this job.",
        status: "error",
      };
    }

    revalidatePath(`/app/groups/${shared.groupSlug}/jobs`);
    return {
      message: shared.shareCreated
        ? "Job shared with the group."
        : "This job was already shared by you. Your note is up to date.",
      status: "success",
    };
  } catch {
    return {
      message: "The job could not be shared. Please try again.",
      status: "error",
    };
  }
}
