import { z } from "zod";

export const reputationEventTypes = [
  "job_shared",
  "job_saved_by_member",
  "application_attributed",
  "referral_completed",
  "interview_helped",
  "hire_helped",
] as const;

export const reputationEventTypeSchema = z.enum(reputationEventTypes);
export type ReputationEventType = z.infer<typeof reputationEventTypeSchema>;

export const reputationEventPolicy = {
  job_shared: {
    label: "Job sharer",
    points: 1,
    sourceEntityType: "job_share",
  },
  job_saved_by_member: {
    label: "Helpful sharer",
    points: 2,
    sourceEntityType: "job_share",
  },
  application_attributed: {
    label: "Application contributor",
    points: 3,
    sourceEntityType: "application",
  },
  referral_completed: {
    label: "Referral helper",
    points: 5,
    sourceEntityType: "referral_request",
  },
  interview_helped: {
    label: "Interview helper",
    points: 4,
    sourceEntityType: "outcome",
  },
  hire_helped: {
    label: "Hire helper",
    points: 10,
    sourceEntityType: "outcome",
  },
} as const satisfies Record<
  ReputationEventType,
  { label: string; points: number; sourceEntityType: string }
>;

export const peopleDirectoryFilters = [
  "all",
  "helpful_sharers",
  "referral_helpers",
] as const;

export const peopleDirectoryFilterSchema = z.enum(peopleDirectoryFilters);
export type PeopleDirectoryFilter = z.infer<typeof peopleDirectoryFilterSchema>;

export const peopleDirectoryFilterLabels: Record<
  PeopleDirectoryFilter,
  string
> = {
  all: "All members",
  helpful_sharers: "Helpful sharers",
  referral_helpers: "Referral helpers",
};

export const reputationSummaryKeys = [
  "jobsShared",
  "jobsSavedByMembers",
  "applicationsAttributed",
  "referralsCompleted",
  "interviewsHelped",
  "hiresHelped",
] as const;

export type ReputationSummary = {
  totalPoints: number;
  jobsShared: number;
  jobsSavedByMembers: number;
  applicationsAttributed: number;
  referralsCompleted: number;
  interviewsHelped: number;
  hiresHelped: number;
};

export const emptyReputationSummary: ReputationSummary = {
  totalPoints: 0,
  jobsShared: 0,
  jobsSavedByMembers: 0,
  applicationsAttributed: 0,
  referralsCompleted: 0,
  interviewsHelped: 0,
  hiresHelped: 0,
};

export function getContributionBadges(summary: ReputationSummary) {
  const badges: ReputationEventType[] = [];
  if (summary.jobsSavedByMembers > 0) badges.push("job_saved_by_member");
  else if (summary.jobsShared > 0) badges.push("job_shared");
  if (summary.referralsCompleted > 0) badges.push("referral_completed");
  if (summary.interviewsHelped > 0) badges.push("interview_helped");
  if (summary.hiresHelped > 0) badges.push("hire_helped");
  if (summary.applicationsAttributed > 0) badges.push("application_attributed");
  return badges;
}
