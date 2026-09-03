import { z } from "zod";

export const applicationStatuses = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
  "hired",
] as const;

export const applicationStatusSchema = z.enum(applicationStatuses);
export const applicationTrackerFilterSchema = z.enum([
  "all",
  ...applicationStatuses,
]);
export const applicationTrackerViewSchema = z.enum(["board", "list"]);

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;
export type ApplicationTrackerFilter = z.infer<
  typeof applicationTrackerFilterSchema
>;
export type ApplicationTrackerView = z.infer<
  typeof applicationTrackerViewSchema
>;

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  hired: "Hired",
};

export const applicationStatusInputSchema = z.object({
  applicationId: z.string().uuid(),
  groupId: z.string().uuid(),
  status: applicationStatusSchema,
});

export const applicationDetailsInputSchema = z.object({
  applicationId: z.string().uuid(),
  groupId: z.string().uuid(),
  privateNotes: z.string().trim().max(5_000),
  nextAction: z.string().trim().max(240),
  nextActionDate: z.union([z.iso.date(), z.literal("")]),
});
