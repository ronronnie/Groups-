// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import type { AiJobExtraction } from "@/domains/jobs/job-extraction";
import {
  extractJobDetails,
  type JobExtractionRequest,
  type JobExtractionModelResponse,
} from "@/server/ai/job-extraction";
import type { AiUsageEvent } from "@/server/ai/usage";

const context = {
  userId: "10000000-0000-4000-8000-000000000001",
  groupId: "20000000-0000-4000-8000-000000000001",
};

const input = {
  url: "https://example.com/jobs/product-designer",
  jobText: "Acme needs a product designer with Figma and research skills.",
  title: null,
  company: null,
};

const validExtraction: AiJobExtraction = {
  company: "Acme",
  title: "Product Designer",
  descriptionSummary: "Design products with a cross-functional team.",
  location: "Bengaluru, India",
  workMode: "hybrid",
  employmentType: "full_time",
  experienceMin: 3,
  experienceMax: 5,
  skills: ["Figma", "Research"],
  salaryText: null,
  source: "Acme careers",
  confidence: 0.91,
  warnings: [],
  missingFields: ["salaryText"],
};

function response(output: unknown): JobExtractionModelResponse {
  return {
    output,
    requestId: "resp_test",
    promptTokens: 120,
    completionTokens: 80,
  };
}

function dependencies(request: JobExtractionRequest) {
  const events: AiUsageEvent[] = [];
  return {
    events,
    values: {
      model: "test-job-model",
      request,
      recordUsage: vi.fn(async (event: AiUsageEvent) => {
        events.push(event);
      }),
    },
  };
}

describe("AI job extraction service", () => {
  it("returns a validated extraction and records privacy-safe usage", async () => {
    const request = vi.fn().mockResolvedValue(response(validExtraction));
    const { events, values } = dependencies(request);

    const result = await extractJobDetails(input, context, values);

    expect(result).toMatchObject({
      outcome: "success",
      attempts: 1,
      extraction: { company: "Acme", confidence: 0.91 },
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      feature: "job_extraction",
      modelAlias: "test-job-model",
      promptTokens: 120,
      completionTokens: 80,
      requestId: "resp_test",
      metadata: {
        attempt: 1,
        inputKind: "url_and_text",
        status: "success",
        confidence: 0.91,
      },
    });
    expect(JSON.stringify(events[0])).not.toContain(input.url);
    expect(JSON.stringify(events[0])).not.toContain(input.jobText);
  });

  it("retries invalid output before returning the fallback", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(response({ title: "Incomplete" }));
    const { events, values } = dependencies(request);

    const result = await extractJobDetails(input, context, values);

    expect(request).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      outcome: "fallback",
      attempts: 2,
      extraction: { confidence: 0, source: "example.com" },
    });
    expect(events.map((event) => event.metadata.status)).toEqual([
      "invalid_output",
      "invalid_output",
    ]);
  });

  it("marks valid low-confidence output for review", async () => {
    const request = vi.fn().mockResolvedValue(
      response({
        ...validExtraction,
        confidence: 0.42,
        warnings: ["Location is unclear."],
      }),
    );
    const { events, values } = dependencies(request);

    const result = await extractJobDetails(input, context, values);

    expect(result.outcome).toBe("low_confidence");
    expect(result.extraction.warnings).toEqual(["Location is unclear."]);
    expect(events[0]?.metadata.status).toBe("low_confidence");
  });

  it("retries API failures and falls back without throwing", async () => {
    const request = vi.fn().mockRejectedValue(new Error("API unavailable"));
    const { events, values } = dependencies(request);

    const result = await extractJobDetails(input, context, values);

    expect(request).toHaveBeenCalledTimes(2);
    expect(result.outcome).toBe("fallback");
    expect(result.extraction.title).toBe("Product Designer");
    expect(events.map((event) => event.metadata.status)).toEqual([
      "error",
      "error",
    ]);
  });

  it("does not let usage logging failure block extraction", async () => {
    const result = await extractJobDetails(input, context, {
      model: "test-job-model",
      request: vi.fn().mockResolvedValue(response(validExtraction)),
      recordUsage: vi.fn().mockRejectedValue(new Error("logging unavailable")),
    });

    expect(result.outcome).toBe("success");
  });
});
