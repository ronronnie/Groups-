"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  applicationDetailsInputSchema,
  applicationStatusInputSchema,
} from "@/domains/applications/tracker";
import { createApplicationSqlExecutor } from "@/server/applications/database";
import {
  updateApplicationDetails,
  updateApplicationStatus,
} from "@/server/applications/service";
import { requireCurrentUser } from "@/server/auth/current-user";

const routeContextSchema = z.object({
  groupId: z.string().uuid(),
  groupSlug: z.string().trim().min(1).max(160),
  applicationId: z.string().uuid(),
});

export type ApplicationDetailsActionState = {
  message: string | null;
  status: "idle" | "success" | "error";
};

function revalidateApplicationViews(groupSlug: string, jobId?: string) {
  revalidatePath(`/app/groups/${groupSlug}/tracker`);
  revalidatePath(`/app/groups/${groupSlug}/for-you`);
  if (jobId) revalidatePath(`/app/groups/${groupSlug}/jobs/${jobId}`);
}

export async function updateApplicationStatusAction(
  groupId: string,
  groupSlug: string,
  applicationId: string,
  formData: FormData,
) {
  const user = await requireCurrentUser("/app");
  const context = routeContextSchema.parse({
    groupId,
    groupSlug,
    applicationId,
  });
  const input = applicationStatusInputSchema.parse({
    applicationId: context.applicationId,
    groupId: context.groupId,
    status: formData.get("status"),
  });
  const updated = await updateApplicationStatus(
    createApplicationSqlExecutor(),
    { ...input, userId: user.id },
  );

  if (!updated) throw new Error("This application is not available to you.");
  revalidateApplicationViews(context.groupSlug, updated.jobId);
}

export async function updateApplicationDetailsAction(
  groupId: string,
  groupSlug: string,
  applicationId: string,
  _previousState: ApplicationDetailsActionState,
  formData: FormData,
): Promise<ApplicationDetailsActionState> {
  const user = await requireCurrentUser("/app");
  const context = routeContextSchema.safeParse({
    groupId,
    groupSlug,
    applicationId,
  });
  const input = applicationDetailsInputSchema.safeParse({
    applicationId,
    groupId,
    privateNotes: formData.get("privateNotes"),
    nextAction: formData.get("nextAction"),
    nextActionDate: formData.get("nextActionDate"),
  });

  if (!context.success || !input.success) {
    return { status: "error", message: "Check the details and try again." };
  }

  const updated = await updateApplicationDetails(
    createApplicationSqlExecutor(),
    { ...input.data, userId: user.id },
  );

  if (!updated) {
    return {
      status: "error",
      message: "This application is not available to you.",
    };
  }

  revalidateApplicationViews(context.data.groupSlug);
  return { status: "success", message: "Private details saved." };
}
