"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createFallbackJobExtraction,
  jobExtractionInputSchema,
  reviewedJobSchema,
  toJobExtractionDraft,
  type JobExtractionDraft,
} from "@/domains/jobs/job-extraction";
import { shareJobInputSchema } from "@/domains/jobs/job-sharing";
import { extractJobDetails } from "@/server/ai/job-extraction";
import { getOpenAIModelConfig } from "@/server/ai/openai";
import { requestStructuredJobExtraction } from "@/server/ai/openai-job-extraction";
import { recordAiUsageEvent } from "@/server/ai/usage";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createJobSqlExecutor } from "@/server/jobs/database";
import { isActiveGroupMember, shareJob } from "@/server/jobs/service";

export type PrepareJobActionState = {
  message: string | null;
  status: "idle" | "error" | "ready";
  draft: JobExtractionDraft | null;
};

export type ShareJobActionState = {
  message: string | null;
  status: "idle" | "error" | "success";
};

const groupIdSchema = z.string().uuid();

export async function prepareJobShareAction(
  groupId: string,
  _previousState: PrepareJobActionState,
  formData: FormData,
): Promise<PrepareJobActionState> {
  const user = await requireCurrentUser("/app");
  const validGroupId = groupIdSchema.safeParse(groupId);
  const shareValues = shareJobInputSchema.safeParse({
    url: formData.get("url"),
    title: formData.get("title"),
    company: formData.get("company"),
    note: formData.get("note"),
  });
  const extractionInput = jobExtractionInputSchema.safeParse({
    url: formData.get("url"),
    jobText: formData.get("jobText"),
    title: formData.get("title"),
    company: formData.get("company"),
  });

  if (
    !validGroupId.success ||
    !shareValues.success ||
    !extractionInput.success
  ) {
    const issue =
      shareValues.error?.issues[0] ?? extractionInput.error?.issues[0];
    return {
      message: issue?.message ?? "Check the job details and retry.",
      status: "error",
      draft: null,
    };
  }

  const execute = createJobSqlExecutor();
  const allowed = await isActiveGroupMember(execute, {
    groupId: validGroupId.data,
    userId: user.id,
  });

  if (!allowed) {
    return {
      message: "You must be an active group member to share this job.",
      status: "error",
      draft: null,
    };
  }

  try {
    const result = await extractJobDetails(
      extractionInput.data,
      { groupId: validGroupId.data, userId: user.id },
      {
        model: getOpenAIModelConfig().responseModel,
        request: requestStructuredJobExtraction,
        recordUsage: (event) => recordAiUsageEvent(execute, event),
      },
    );
    const draft = toJobExtractionDraft(
      { ...extractionInput.data, note: shareValues.data.note },
      result.extraction,
      result.outcome,
    );

    return {
      message:
        result.outcome === "success"
          ? "Details extracted. Review them before sharing."
          : "Some details need your review before sharing.",
      status: "ready",
      draft,
    };
  } catch {
    const fallback = createFallbackJobExtraction(extractionInput.data);
    return {
      message:
        "Automatic extraction is unavailable. Review the details before sharing.",
      status: "ready",
      draft: toJobExtractionDraft(
        { ...extractionInput.data, note: shareValues.data.note },
        fallback,
        "fallback",
      ),
    };
  }
}

export async function shareJobAction(
  groupId: string,
  _previousState: ShareJobActionState,
  formData: FormData,
): Promise<ShareJobActionState> {
  const user = await requireCurrentUser("/app");
  const validGroupId = groupIdSchema.safeParse(groupId);
  const reviewed = reviewedJobSchema.safeParse({
    url: formData.get("url"),
    title: formData.get("title"),
    company: formData.get("company"),
    descriptionSummary: formData.get("descriptionSummary"),
    location: formData.get("location"),
    workMode: formData.get("workMode"),
    employmentType: formData.get("employmentType"),
    experienceMin: formData.get("experienceMin"),
    experienceMax: formData.get("experienceMax"),
    skills: formData.get("skills"),
    salaryText: formData.get("salaryText"),
    note: formData.get("note"),
  });

  if (!validGroupId.success || !reviewed.success) {
    return {
      message:
        reviewed.error?.issues[0]?.message ??
        "Check the reviewed job details and retry.",
      status: "error",
    };
  }

  try {
    const shared = await shareJob(createJobSqlExecutor(), {
      url: reviewed.data.url,
      title: reviewed.data.title,
      company: reviewed.data.company,
      note: reviewed.data.note,
      reviewedJob: reviewed.data,
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
