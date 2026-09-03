import { z } from "zod";

export const referralStates = [
  "requested",
  "accepted",
  "declined",
  "needs_info",
  "referred",
  "closed",
] as const;

export const referralStateSchema = z.enum(referralStates);
export type ReferralState = z.infer<typeof referralStateSchema>;

export const referralStateLabels: Record<ReferralState, string> = {
  requested: "Requested",
  accepted: "Accepted",
  declined: "Declined",
  needs_info: "Needs info",
  referred: "Referred",
  closed: "Closed",
};

export const createReferralRequestSchema = z.object({
  groupId: z.string().uuid(),
  jobId: z.string().uuid(),
  potentialReferrerId: z.string().uuid(),
  message: z.string().trim().min(20).max(600),
});

export const transitionReferralRequestSchema = z.object({
  groupId: z.string().uuid(),
  requestId: z.string().uuid(),
  nextState: referralStateSchema,
  note: z.string().trim().max(600).default(""),
});

export type ReferralActor = "requester" | "referrer";

const allowedTransitions: Record<
  ReferralActor,
  Partial<Record<ReferralState, readonly ReferralState[]>>
> = {
  requester: {
    requested: ["closed"],
    accepted: ["closed"],
    needs_info: ["requested", "closed"],
    referred: ["closed"],
  },
  referrer: {
    requested: ["accepted", "declined", "needs_info"],
    accepted: ["needs_info", "referred", "declined"],
    needs_info: ["accepted", "declined"],
  },
};

export function canTransitionReferral(
  actor: ReferralActor,
  from: ReferralState,
  to: ReferralState,
) {
  return allowedTransitions[actor][from]?.includes(to) ?? false;
}

export type ReferrerMatchCandidate = {
  userId: string;
  displayName: string;
  currentCompany: string | null;
  currentRole: string | null;
  sharedJob: boolean;
};

export type PotentialReferrer = ReferrerMatchCandidate & {
  score: number;
  context: string[];
};

function normalize(value: string | null) {
  return value?.trim().toLocaleLowerCase() ?? "";
}

function words(value: string) {
  return new Set(
    value
      .toLocaleLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 3),
  );
}

export function rankPotentialReferrers(
  job: { company: string; title: string },
  candidates: ReferrerMatchCandidate[],
  limit = 3,
): PotentialReferrer[] {
  const titleWords = words(job.title);

  return candidates
    .map((candidate) => {
      let score = 0;
      const context: string[] = [];

      if (
        candidate.currentCompany &&
        normalize(candidate.currentCompany) === normalize(job.company)
      ) {
        score += 100;
        context.push(`Works at ${candidate.currentCompany}`);
      }

      if (candidate.sharedJob) {
        score += 50;
        context.push("Shared this job with the group");
      }

      if (candidate.currentRole) {
        const roleWords = words(candidate.currentRole);
        const overlap = [...roleWords].some((word) => titleWords.has(word));
        if (overlap) {
          score += 20;
          context.push(`Relevant role: ${candidate.currentRole}`);
        }
      }

      return { ...candidate, score, context };
    })
    .filter((candidate) => candidate.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.displayName.localeCompare(right.displayName) ||
        left.userId.localeCompare(right.userId),
    )
    .slice(0, Math.max(0, limit));
}
