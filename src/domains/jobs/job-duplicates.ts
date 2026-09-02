import { canonicalizeJobUrl } from "@/domains/jobs/job-sharing";

export type DuplicateJobInput = {
  canonicalUrl: string;
  company: string;
  title: string;
  location: string;
};

export type DuplicateJobCandidate = DuplicateJobInput & {
  id: string;
};

export type DuplicateJobMatch = DuplicateJobCandidate & {
  kind: "exact" | "near";
  confidence: "certain" | "strong" | "possible";
  score: number;
};

const titleStopWords = new Set([
  "and",
  "the",
  "for",
  "senior",
  "junior",
  "lead",
  "staff",
  "principal",
  "intern",
  "remote",
]);

function normalize(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(value: string, stopWords = new Set<string>()) {
  return new Set(
    normalize(value)
      .split(" ")
      .filter((token) => token.length > 1 && !stopWords.has(token)),
  );
}

function diceSimilarity(left: string, right: string, stopWords?: Set<string>) {
  const leftTokens = tokenize(left, stopWords);
  const rightTokens = tokenize(right, stopWords);
  if (!leftTokens.size || !rightTokens.size) return 0;

  const overlap = [...leftTokens].filter((token) => rightTokens.has(token));
  return (2 * overlap.length) / (leftTokens.size + rightTokens.size);
}

function locationCompatibility(left: string, right: string) {
  if (!normalize(left) || !normalize(right)) return 0.5;
  if (
    normalize(left).includes(normalize(right)) ||
    normalize(right).includes(normalize(left))
  ) {
    return 1;
  }
  return diceSimilarity(left, right);
}

function scoreNearDuplicate(
  input: DuplicateJobInput,
  candidate: DuplicateJobCandidate,
) {
  if (normalize(input.company) !== normalize(candidate.company)) return null;

  const titleScore = diceSimilarity(
    input.title,
    candidate.title,
    titleStopWords,
  );
  const locationScore = locationCompatibility(
    input.location,
    candidate.location,
  );
  if (titleScore < 0.65 || locationScore < 0.35) return null;

  const score = Math.round((titleScore * 0.85 + locationScore * 0.15) * 100);
  return {
    ...candidate,
    kind: "near" as const,
    confidence: score >= 85 ? ("strong" as const) : ("possible" as const),
    score,
  };
}

export function detectDuplicateJob(
  input: DuplicateJobInput,
  candidates: DuplicateJobCandidate[],
): DuplicateJobMatch | null {
  const canonicalUrl = canonicalizeJobUrl(input.canonicalUrl);
  const exact = candidates.find(
    (candidate) => canonicalizeJobUrl(candidate.canonicalUrl) === canonicalUrl,
  );

  if (exact) {
    return {
      ...exact,
      kind: "exact",
      confidence: "certain",
      score: 100,
    };
  }

  return (
    candidates
      .map((candidate) => scoreNearDuplicate(input, candidate))
      .filter((match): match is NonNullable<typeof match> => match !== null)
      .sort((left, right) => right.score - left.score)[0] ?? null
  );
}
