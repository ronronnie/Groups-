import {
  aiJobExtractionSchema,
  createFallbackJobExtraction,
  jobExtractionInputSchema,
  JOB_EXTRACTION_CONFIDENCE_THRESHOLD,
  mergeJobExtraction,
  type AiJobExtraction,
  type JobExtractionInput,
} from "@/domains/jobs/job-extraction";
import type { AiUsageEvent, AiUsageRecorder } from "@/server/ai/usage";

const MAX_ATTEMPTS = 2;

export type JobExtractionModelResponse = {
  output: unknown;
  requestId: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
};

export type JobExtractionRequest = (
  input: JobExtractionInput,
  model: string,
) => Promise<JobExtractionModelResponse>;

type ExtractionContext = {
  userId: string;
  groupId: string;
};

type ExtractionDependencies = {
  model: string;
  request: JobExtractionRequest;
  recordUsage: AiUsageRecorder;
};

export type JobExtractionResult = {
  extraction: AiJobExtraction;
  outcome: "success" | "low_confidence" | "fallback";
  attempts: number;
};

function getInputKind(input: JobExtractionInput) {
  if (input.url && input.jobText) return "url_and_text";
  return input.jobText ? "text" : "url";
}

async function recordUsageSafely(
  recorder: AiUsageRecorder,
  event: AiUsageEvent,
) {
  try {
    await recorder(event);
  } catch {
    // Observability must never prevent a user from sharing a job.
  }
}

function usageEvent(
  context: ExtractionContext,
  model: string,
  input: JobExtractionInput,
  attempt: number,
  status: "success" | "low_confidence" | "invalid_output" | "error",
  response?: JobExtractionModelResponse,
  confidence?: number,
): AiUsageEvent {
  return {
    userId: context.userId,
    groupId: context.groupId,
    feature: "job_extraction",
    modelAlias: model,
    promptTokens: response?.promptTokens ?? null,
    completionTokens: response?.completionTokens ?? null,
    requestId: response?.requestId ?? null,
    metadata: {
      attempt,
      inputKind: getInputKind(input),
      status,
      ...(confidence === undefined ? {} : { confidence }),
    },
  };
}

export async function extractJobDetails(
  rawInput: JobExtractionInput,
  context: ExtractionContext,
  dependencies: ExtractionDependencies,
): Promise<JobExtractionResult> {
  const input = jobExtractionInputSchema.parse(rawInput);
  const { model, request, recordUsage } = dependencies;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await request(input, model);
      const parsed = aiJobExtractionSchema.safeParse(response.output);

      if (!parsed.success) {
        await recordUsageSafely(
          recordUsage,
          usageEvent(
            context,
            model,
            input,
            attempt,
            "invalid_output",
            response,
          ),
        );
        continue;
      }

      const extraction = mergeJobExtraction(input, parsed.data);
      const outcome =
        extraction.confidence < JOB_EXTRACTION_CONFIDENCE_THRESHOLD
          ? "low_confidence"
          : "success";
      await recordUsageSafely(
        recordUsage,
        usageEvent(
          context,
          model,
          input,
          attempt,
          outcome,
          response,
          extraction.confidence,
        ),
      );

      return { extraction, outcome, attempts: attempt };
    } catch {
      await recordUsageSafely(
        recordUsage,
        usageEvent(context, model, input, attempt, "error"),
      );
    }
  }

  return {
    extraction: createFallbackJobExtraction(input),
    outcome: "fallback",
    attempts: MAX_ATTEMPTS,
  };
}
