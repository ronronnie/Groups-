import { z } from "zod";

export const outcomeTypes = ["interview", "offer", "hired"] as const;
export type OutcomeType = (typeof outcomeTypes)[number];
export const outcomeLabels: Record<OutcomeType, string> = {
  interview: "Got an interview",
  offer: "Got an offer",
  hired: "Got hired",
};
export const outcomeStage: Record<OutcomeType, string> = {
  interview: "interviewing",
  offer: "offer",
  hired: "hired",
};

export const recordOutcomeSchema = z.object({
  groupId: z.string().uuid(),
  applicationId: z.string().uuid(),
  outcomeType: z.enum(outcomeTypes),
  confirmed: z.literal(true),
  creditSharer: z.boolean(),
  creditReferrer: z.boolean(),
});

export const outcomeVisibilitySchema = z.discriminatedUnion("visibility", [
  z.object({
    groupId: z.string().uuid(),
    outcomeId: z.string().uuid(),
    visibility: z.literal("group"),
    consent: z.literal(true),
  }),
  z.object({
    groupId: z.string().uuid(),
    outcomeId: z.string().uuid(),
    visibility: z.literal("private"),
  }),
]);
