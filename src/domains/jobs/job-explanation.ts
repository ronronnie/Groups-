import type {
  MatchCandidate,
  MatchProfile,
  MatchResult,
} from "@/domains/jobs/job-ranking";

function formatList(values: string[]) {
  if (values.length <= 1) return values[0] ?? "";
  return `${values.slice(0, -1).join(", ")} and ${values.at(-1)}`;
}

export function explainJobMatch(
  profile: MatchProfile,
  candidate: MatchCandidate,
  match: MatchResult,
) {
  const reasons: string[] = [];

  if (match.matchedRoles.length) {
    reasons.push(`aligns with ${formatList(match.matchedRoles.slice(0, 2))}`);
  }
  if (match.matchedSkills.length) {
    reasons.push(`uses ${formatList(match.matchedSkills.slice(0, 3))}`);
  }
  if (match.matchedLocations.length) {
    reasons.push(`matches your ${match.matchedLocations[0]} preference`);
  }
  if (
    candidate.workMode !== "unspecified" &&
    profile.remotePreference === candidate.workMode
  ) {
    reasons.push(`matches your ${candidate.workMode} preference`);
  }
  if (match.breakdown.experience === 15) {
    reasons.push("fits your experience range");
  }

  if (!reasons.length) {
    return "This role has limited matching detail, so review the listing before deciding.";
  }

  const selected = reasons.slice(0, 2);
  return `This role ${formatList(selected)}.`;
}
