import { describe, expect, it } from "vitest";
import { zodTextFormat } from "openai/helpers/zod";
import {
  aiJobExtractionSchema,
  createFallbackJobExtraction,
  jobExtractionInputSchema,
  mergeJobExtraction,
  reviewedJobSchema,
} from "@/domains/jobs/job-extraction";

const validExtraction = {
  company: "Acme",
  title: "Product Designer",
  descriptionSummary: "Design tools for growing teams.",
  location: "Bengaluru, India",
  workMode: "hybrid" as const,
  employmentType: "full_time" as const,
  experienceMin: 3,
  experienceMax: 5,
  skills: ["Figma", "Research"],
  salaryText: null,
  source: "Acme careers",
  confidence: 0.92,
  warnings: [],
  missingFields: ["salaryText" as const],
};

describe("job extraction schemas", () => {
  it("converts to an OpenAI strict structured-output format", () => {
    const format = zodTextFormat(aiJobExtractionSchema, "job_extraction");

    expect(format).toMatchObject({ type: "json_schema", strict: true });
  });

  it("accepts either a URL or pasted job text", () => {
    expect(
      jobExtractionInputSchema.parse({
        url: "",
        jobText: "A product design role at Acme.",
        title: "",
        company: "",
      }),
    ).toMatchObject({ jobText: "A product design role at Acme." });

    expect(
      jobExtractionInputSchema.safeParse({ url: "", jobText: "" }).success,
    ).toBe(false);
  });

  it("rejects invalid model output and impossible experience ranges", () => {
    expect(
      aiJobExtractionSchema.safeParse({
        ...validExtraction,
        confidence: 1.4,
      }).success,
    ).toBe(false);
    expect(
      aiJobExtractionSchema.safeParse({
        ...validExtraction,
        experienceMin: 8,
        experienceMax: 3,
      }).success,
    ).toBe(false);
  });

  it("uses deterministic details when extraction is unavailable", () => {
    const fallback = createFallbackJobExtraction(
      jobExtractionInputSchema.parse({
        url: "https://jobs.lever.co/acme/product-designer",
        jobText: "",
        title: "",
        company: "",
      }),
    );

    expect(fallback).toMatchObject({
      company: "Acme",
      title: "Product Designer",
      confidence: 0,
      source: "jobs.lever.co",
    });
  });

  it("preserves manual hints and canonical source over model guesses", () => {
    const input = jobExtractionInputSchema.parse({
      url: "https://www.example.com/jobs/123?utm_source=test",
      jobText: "Listing text",
      title: "Staff Product Designer",
      company: "Example Corp",
    });
    const merged = mergeJobExtraction(input, {
      ...validExtraction,
      skills: ["Figma", "figma", "Research"],
    });

    expect(merged).toMatchObject({
      company: "Example Corp",
      title: "Staff Product Designer",
      source: "example.com",
      skills: ["Figma", "Research"],
    });
  });

  it("validates edited job details before persistence", () => {
    const result = reviewedJobSchema.safeParse({
      url: "https://example.com/jobs/designer",
      company: "Example",
      title: "Designer",
      descriptionSummary: "A concise summary.",
      location: "Remote",
      workMode: "remote",
      employmentType: "full_time",
      experienceMin: "2",
      experienceMax: "5",
      skills: "Figma, Research",
      salaryText: "",
      note: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skills).toEqual(["Figma", "Research"]);
      expect(result.data.experienceMin).toBe(2);
      expect(result.data.salaryText).toBeNull();
    }
  });
});
