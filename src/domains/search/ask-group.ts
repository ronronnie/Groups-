import { z } from "zod";

export const askGroupQuestionSchema = z
  .string()
  .trim()
  .min(3, "Ask a question with at least 3 characters.")
  .max(500, "Keep questions under 500 characters.");

export const askGroupSourceKindSchema = z.enum([
  "job",
  "job_share",
  "discussion",
  "profile",
  "outcome",
  "reputation",
]);

export const askGroupSourceSchema = z.object({
  key: z.string().min(1).max(180),
  kind: askGroupSourceKindSchema,
  title: z.string().min(1).max(240),
  excerpt: z.string().min(1).max(500),
  href: z.string().startsWith("/app/groups/"),
  score: z.number().min(0).max(1),
});

export const askGroupResponseSchema = z.object({
  answer: z.string().trim().min(1).max(900),
  sources: z.array(askGroupSourceSchema).max(6),
  mode: z.enum(["ai", "fallback"]),
});

export const generatedGroupAnswerSchema = z.object({
  answer: z.string().trim().min(1).max(900),
  citedSourceKeys: z.array(z.string().min(1).max(180)).max(6),
});

export type AskGroupSourceKind = z.infer<typeof askGroupSourceKindSchema>;
export type AskGroupSource = z.infer<typeof askGroupSourceSchema>;
export type AskGroupResponse = z.infer<typeof askGroupResponseSchema>;
