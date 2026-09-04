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
import type { DuplicateJobMatch } from "@/domains/jobs/job-duplicates";
import { shareJobInputSchema } from "@/domains/jobs/job-sharing";
import { extractJobDetails } from "@/server/ai/job-extraction";
import { getOpenAIModelConfig } from "@/server/ai/openai";
import { requestStructuredJobExtraction } from "@/server/ai/openai-job-extraction";
import { recordAiUsageEvent } from "@/server/ai/usage";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createJobSqlExecutor } from "@/server/jobs/database";
import {
  findGroupJobDuplicate,
  isActiveGroupMember,
  shareJob,
} from "@/server/jobs/service";
import {
  createJobSharedEvent,
  createStrongMatchEventsForJob,
} from "@/server/notifications/service";

export type PrepareJobActionState = {
  message: string | null;
  status: "idle" | "error" | "ready";
  draft: JobExtractionDraft | null;
  duplicate: DuplicateJobMatch | null;
};

export type ShareJobActionState = {
  message: string | null;
  status: "idle" | "error" | "success";
};

const groupIdSchema = z.string().uuid();
const optionalJobIdSchema = z.preprocess(
  (value) => (value === "" || value === null ? null : value),
  z.string().uuid().nullable(),
);

async function findDuplicateForDraft(
  execute: ReturnType<typeof createJobSqlExecutor>,
  input: {
    groupId: string;
    viewerId: string;
    draft: JobExtractionDraft;
  },
) {
  try {
    return await findGroupJobDuplicate(execute, {
      groupId: input.groupId,
      viewerId: input.viewerId,
      url: input.draft.url,
      title: input.draft.title ?? "Job opportunity",
      company: input.draft.company ?? "Company not provided",
      location: input.draft.location ?? "",
    });
  } catch {
    return null;
  }
}

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
      duplicate: null,
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
      duplicate: null,
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
    const duplicate = await findDuplicateForDraft(execute, {
      groupId: validGroupId.data,
      viewerId: user.id,
      draft,
    });

    return {
      message:
        result.outcome === "success"
          ? "Details extracted. Review them before sharing."
          : "Some details need your review before sharing.",
      status: "ready",
      draft,
      duplicate,
    };
  } catch {
    const fallback = createFallbackJobExtraction(extractionInput.data);
    const draft = toJobExtractionDraft(
      { ...extractionInput.data, note: shareValues.data.note },
      fallback,
      "fallback",
    );
    const duplicate = await findDuplicateForDraft(execute, {
      groupId: validGroupId.data,
      viewerId: user.id,
      draft,
    });
    return {
      message:
        "Automatic extraction is unavailable. Review the details before sharing.",
      status: "ready",
      draft,
      duplicate,
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
  const reuseJobId = optionalJobIdSchema.safeParse(formData.get("reuseJobId"));

  if (!validGroupId.success || !reviewed.success || !reuseJobId.success) {
    return {
      message:
        reviewed.error?.issues[0]?.message ??
        "Check the reviewed job details and retry.",
      status: "error",
    };
  }

  try {
    const execute = createJobSqlExecutor();
    const shared = await shareJob(execute, {
      url: reviewed.data.url,
      title: reviewed.data.title,
      company: reviewed.data.company,
      note: reviewed.data.note,
      reviewedJob: reviewed.data,
      groupId: validGroupId.data,
      sharerId: user.id,
      reuseJobId: reuseJobId.data,
    });

    if (!shared) {
      return {
        message: "You must be an active group member to share this job.",
        status: "error",
      };
    }

    if (shared.shareCreated) {
      await Promise.allSettled([
        createJobSharedEvent(execute, {
          groupId: validGroupId.data,
          actorUserId: user.id,
          jobId: shared.jobId,
          shareId: shared.shareId,
        }),
        createStrongMatchEventsForJob(execute, {
          groupId: validGroupId.data,
          groupSlug: shared.groupSlug,
          jobId: shared.jobId,
          actorUserId: user.id,
        }),
      ]);
    }

    revalidatePath(`/app/groups/${shared.groupSlug}/jobs`);
    revalidatePath(`/app/groups/${shared.groupSlug}/jobs/${shared.jobId}`);
    return {
      message: shared.reusedExisting
        ? shared.shareCreated
          ? "Your share was added to the existing job."
          : "Your note on the existing job is up to date."
        : shared.shareCreated
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
