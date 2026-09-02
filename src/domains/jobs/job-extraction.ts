import { z } from "zod";
import {
  canonicalizeJobUrl,
  extractFallbackJobDetails,
  jobUrlSchema,
} from "@/domains/jobs/job-sharing";

export const JOB_EXTRACTION_CONFIDENCE_THRESHOLD = 0.7;
export const JOB_TEXT_MAX_LENGTH = 20_000;

const workModeSchema = z.enum(["remote", "hybrid", "onsite", "unspecified"]);
const employmentTypeSchema = z.enum([
  "full_time",
  "part_time",
  "contract",
  "internship",
  "temporary",
  "unspecified",
]);
const missingFieldSchema = z.enum([
  "company",
  "title",
  "descriptionSummary",
  "location",
  "workMode",
  "employmentType",
  "experienceRange",
  "skills",
  "salaryText",
  "source",
]);

const optionalInputText = (maximum: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(maximum).nullable().optional(),
  );

const optionalOutputText = (maximum: number) =>
  z.string().trim().min(1).max(maximum).nullable();

export const jobExtractionInputSchema = z
  .object({
    url: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? null : value,
      jobUrlSchema.nullable().optional(),
    ),
    jobText: optionalInputText(JOB_TEXT_MAX_LENGTH),
    title: optionalInputText(160),
    company: optionalInputText(120),
  })
  .superRefine((value, context) => {
    if (!value.url && !value.jobText) {
      context.addIssue({
        code: "custom",
        message: "Enter a job URL or paste the job description.",
        path: ["url"],
      });
    }
  });

export const aiJobExtractionSchema = z
  .object({
    company: optionalOutputText(120),
    title: optionalOutputText(160),
    descriptionSummary: optionalOutputText(1_200),
    location: optionalOutputText(160),
    workMode: workModeSchema,
    employmentType: employmentTypeSchema,
    experienceMin: z.number().int().min(0).max(80).nullable(),
    experienceMax: z.number().int().min(0).max(80).nullable(),
    skills: z.array(z.string().trim().min(1).max(80)).max(30),
    salaryText: optionalOutputText(160),
    source: z.string().trim().min(1).max(255),
    confidence: z.number().min(0).max(1),
    warnings: z.array(z.string().trim().min(1).max(240)).max(10),
    missingFields: z.array(missingFieldSchema).max(10),
  })
  .superRefine((value, context) => {
    if (
      value.experienceMin !== null &&
      value.experienceMax !== null &&
      value.experienceMax < value.experienceMin
    ) {
      context.addIssue({
        code: "custom",
        message: "Maximum experience cannot be below minimum experience.",
        path: ["experienceMax"],
      });
    }
  });

const nullableFormText = (maximum: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(maximum).nullable(),
  );

const optionalYear = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") return null;
  return typeof value === "string" ? Number(value) : value;
}, z.number().int().min(0).max(80).nullable());

export const reviewedJobSchema = z
  .object({
    url: jobUrlSchema,
    company: z.string().trim().min(1, "Enter the company name.").max(120),
    title: z.string().trim().min(1, "Enter the role title.").max(160),
    descriptionSummary: z.string().trim().max(1_200),
    location: z.string().trim().max(160),
    workMode: workModeSchema,
    employmentType: employmentTypeSchema,
    experienceMin: optionalYear,
    experienceMax: optionalYear,
    skills: z.preprocess(
      (value) =>
        typeof value === "string"
          ? value
              .split(",")
              .map((skill) => skill.trim())
              .filter(Boolean)
          : value,
      z.array(z.string().trim().min(1).max(80)).max(30),
    ),
    salaryText: nullableFormText(160),
    note: nullableFormText(1_000),
  })
  .superRefine((value, context) => {
    if (
      value.experienceMin !== null &&
      value.experienceMax !== null &&
      value.experienceMax < value.experienceMin
    ) {
      context.addIssue({
        code: "custom",
        message: "Maximum experience cannot be below minimum experience.",
        path: ["experienceMax"],
      });
    }
  });

export type JobExtractionInput = z.infer<typeof jobExtractionInputSchema>;
export type AiJobExtraction = z.infer<typeof aiJobExtractionSchema>;
export type ReviewedJob = z.infer<typeof reviewedJobSchema>;

export type JobExtractionDraft = Omit<AiJobExtraction, "missingFields"> & {
  url: string;
  note: string | null;
  outcome: "success" | "low_confidence" | "fallback";
};

function uniqueSkills(skills: string[]) {
  const seen = new Set<string>();

  return skills.filter((skill) => {
    const key = skill.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function createFallbackJobExtraction(input: JobExtractionInput) {
  const canonicalUrl = input.url ? canonicalizeJobUrl(input.url) : null;
  const fallback = canonicalUrl
    ? extractFallbackJobDetails(canonicalUrl, {
        company: input.company ?? null,
        title: input.title ?? null,
      })
    : {
        company: input.company ?? "Company not provided",
        title: input.title ?? "Job opportunity",
        source: "provided_text",
      };

  return aiJobExtractionSchema.parse({
    company: fallback.company,
    title: fallback.title,
    descriptionSummary: null,
    location: null,
    workMode: "unspecified",
    employmentType: "unspecified",
    experienceMin: null,
    experienceMax: null,
    skills: [],
    salaryText: null,
    source: fallback.source,
    confidence: 0,
    warnings: ["Automatic extraction was unavailable. Review the details."],
    missingFields: [
      "descriptionSummary",
      "location",
      "workMode",
      "employmentType",
      "experienceRange",
      "skills",
      "salaryText",
    ],
  });
}

export function mergeJobExtraction(
  input: JobExtractionInput,
  extraction: AiJobExtraction,
) {
  const canonicalUrl = input.url ? canonicalizeJobUrl(input.url) : null;
  const fallback = createFallbackJobExtraction(input);
  const source = canonicalUrl
    ? new URL(canonicalUrl).hostname
    : extraction.source;

  return aiJobExtractionSchema.parse({
    ...extraction,
    company: input.company ?? extraction.company ?? fallback.company,
    title: input.title ?? extraction.title ?? fallback.title,
    source,
    skills: uniqueSkills(extraction.skills),
  });
}

export function toJobExtractionDraft(
  input: JobExtractionInput & { note?: string | null },
  extraction: AiJobExtraction,
  outcome: JobExtractionDraft["outcome"],
): JobExtractionDraft {
  if (!input.url) {
    throw new Error("A URL is required before a job can be shared.");
  }

  return {
    url: canonicalizeJobUrl(input.url),
    company: extraction.company ?? "Company not provided",
    title: extraction.title ?? "Job opportunity",
    descriptionSummary: extraction.descriptionSummary,
    location: extraction.location,
    workMode: extraction.workMode,
    employmentType: extraction.employmentType,
    experienceMin: extraction.experienceMin,
    experienceMax: extraction.experienceMax,
    skills: extraction.skills,
    salaryText: extraction.salaryText,
    source: extraction.source,
    confidence: extraction.confidence,
    warnings: extraction.warnings,
    note: input.note ?? null,
    outcome,
  };
}
