"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createJobSqlExecutor } from "@/server/jobs/database";
import {
  createJobDiscussionMessage,
  discussionMessageSchema,
} from "@/server/jobs/discussion-service";

export type DiscussionActionState = {
  message: string | null;
  status: "idle" | "error" | "success";
};

const contextSchema = z.object({
  groupId: z.string().uuid(),
  groupSlug: z.string().trim().min(1).max(160),
  jobId: z.string().uuid(),
});

export async function postJobDiscussionAction(
  groupId: string,
  groupSlug: string,
  jobId: string,
  _previousState: DiscussionActionState,
  formData: FormData,
): Promise<DiscussionActionState> {
  const user = await requireCurrentUser("/app");
  const context = contextSchema.safeParse({ groupId, groupSlug, jobId });
  const body = discussionMessageSchema.safeParse(formData.get("body"));

  if (!context.success || !body.success) {
    return {
      message: body.error?.issues[0]?.message ?? "Check the message and retry.",
      status: "error",
    };
  }

  try {
    const message = await createJobDiscussionMessage(createJobSqlExecutor(), {
      groupId: context.data.groupId,
      jobId: context.data.jobId,
      authorId: user.id,
      body: body.data,
    });

    if (!message) {
      return {
        message: "This discussion is available only to active group members.",
        status: "error",
      };
    }

    revalidatePath(
      `/app/groups/${context.data.groupSlug}/jobs/${context.data.jobId}`,
    );
    return { message: "Message posted.", status: "success" };
  } catch {
    return {
      message: "The message could not be posted. Please try again.",
      status: "error",
    };
  }
}
