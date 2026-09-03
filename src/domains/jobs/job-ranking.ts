export type MatchProfile = {
  desiredRoles: string[];
  skills: string[];
  yearsExperience: number;
  preferredLocations: string[];
  remotePreference: "remote" | "hybrid" | "onsite" | "flexible";
};

export type MatchCandidate = {
  title: string;
  skills: string[];
  experienceMin: number | null;
  experienceMax: number | null;
  location: string;
  workMode: "remote" | "hybrid" | "onsite" | "unspecified";
  sharedAt: Date;
  saved: boolean;
  dismissed: boolean;
  applicationStatus: string | null;
};

export type MatchBreakdown = {
  role: number;
  skills: number;
  experience: number;
  location: number;
  workMode: number;
  recency: number;
  stateAdjustment: number;
};

export type MatchResult = {
  score: number;
  strength: "strong" | "good" | "possible";
  breakdown: MatchBreakdown;
  matchedRoles: string[];
  matchedSkills: string[];
  matchedLocations: string[];
};

const stopWords = new Set([
  "and",
  "the",
  "a",
  "an",
  "for",
  "of",
  "to",
  "in",
  "with",
  "senior",
  "junior",
  "lead",
  "staff",
]);

function normalize(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(value: string) {
  return new Set(
    normalize(value)
      .split(" ")
      .filter((token) => token.length > 1 && !stopWords.has(token)),
  );
}

function phraseSimilarity(left: string, right: string) {
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);
  if (!normalizedLeft || !normalizedRight) return 0;
  if (
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  ) {
    return 1;
  }

  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  if (!leftTokens.size || !rightTokens.size) return 0;

  const overlap = [...leftTokens].filter((token) => rightTokens.has(token));
  return overlap.length / Math.min(leftTokens.size, rightTokens.size);
}

function matchingValues(expected: string[], actual: string[]) {
  return expected.filter((value) =>
    actual.some((candidate) => phraseSimilarity(value, candidate) >= 0.75),
  );
}

function scoreRoles(profile: MatchProfile, candidate: MatchCandidate) {
  const similarities = profile.desiredRoles.map((role) => ({
    role,
    similarity: phraseSimilarity(role, candidate.title),
  }));
  const highest = Math.max(0, ...similarities.map((item) => item.similarity));

  return {
    score: Math.round(highest * 35),
    matches: similarities
      .filter((item) => item.similarity >= 0.75)
      .map((item) => item.role),
  };
}

function scoreSkills(profile: MatchProfile, candidate: MatchCandidate) {
  if (!profile.skills.length || !candidate.skills.length) {
    return { score: 0, matches: [] };
  }

  const matches = matchingValues(profile.skills, candidate.skills);
  return {
    score: Math.round((matches.length / candidate.skills.length) * 25),
    matches,
  };
}

function scoreExperience(profile: MatchProfile, candidate: MatchCandidate) {
  const { experienceMin, experienceMax } = candidate;
  if (experienceMin === null && experienceMax === null) return 0;

  const minimum = experienceMin ?? 0;
  const maximum = experienceMax ?? Number.POSITIVE_INFINITY;
  if (
    profile.yearsExperience >= minimum &&
    profile.yearsExperience <= maximum
  ) {
    return 15;
  }

  const gap =
    profile.yearsExperience < minimum
      ? minimum - profile.yearsExperience
      : profile.yearsExperience - maximum;
  return Math.max(0, 15 - gap * 5);
}

function scoreLocation(profile: MatchProfile, candidate: MatchCandidate) {
  if (!profile.preferredLocations.length || !candidate.location) {
    return { score: 0, matches: [] };
  }

  const matches = matchingValues(profile.preferredLocations, [
    candidate.location,
  ]);
  return { score: matches.length ? 10 : 0, matches };
}

function scoreWorkMode(profile: MatchProfile, candidate: MatchCandidate) {
  if (candidate.workMode === "unspecified") return 0;
  if (profile.remotePreference === "flexible") return 5;
  return profile.remotePreference === candidate.workMode ? 10 : 0;
}

function scoreRecency(sharedAt: Date, now: Date) {
  const ageInDays = Math.max(
    0,
    (now.getTime() - sharedAt.getTime()) / (24 * 60 * 60 * 1_000),
  );
  if (ageInDays <= 7) return 5;
  if (ageInDays <= 30) return 3;
  if (ageInDays <= 90) return 1;
  return 0;
}

function stateAdjustment(candidate: MatchCandidate) {
  if (candidate.dismissed) return -100;
  const applied =
    candidate.applicationStatus !== null &&
    candidate.applicationStatus !== "saved";
  return (candidate.saved ? 5 : 0) + (applied ? -15 : 0);
}

export function rankJobMatch(
  profile: MatchProfile,
  candidate: MatchCandidate,
  now = new Date(),
): MatchResult {
  const role = scoreRoles(profile, candidate);
  const skills = scoreSkills(profile, candidate);
  const experience = scoreExperience(profile, candidate);
  const location = scoreLocation(profile, candidate);
  const workMode = scoreWorkMode(profile, candidate);
  const recency = scoreRecency(candidate.sharedAt, now);
  const adjustment = stateAdjustment(candidate);
  const breakdown = {
    role: role.score,
    skills: skills.score,
    experience,
    location: location.score,
    workMode,
    recency,
    stateAdjustment: adjustment,
  };
  const score = Math.max(
    0,
    Math.min(
      100,
      Object.values(breakdown).reduce((sum, value) => sum + value, 0),
    ),
  );

  return {
    score,
    strength: score >= 75 ? "strong" : score >= 50 ? "good" : "possible",
    breakdown,
    matchedRoles: role.matches,
    matchedSkills: skills.matches,
    matchedLocations: location.matches,
  };
}
