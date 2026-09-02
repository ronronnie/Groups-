import { z } from "zod";

const blockedHostnames = new Set(["localhost", "0.0.0.0"]);
const trackingParameters = new Set([
  "fbclid",
  "gclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "ref",
  "referrer",
]);

const optionalShortText = (maximum: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(maximum).nullable(),
  );

function isPrivateIpv4(hostname: string) {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!match) return false;

  const octets = match.slice(1).map(Number);
  if (octets.some((octet) => octet > 255)) return true;

  const [first, second] = octets;
  return (
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second !== undefined && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function normalizeHostname(hostname: string) {
  return hostname.toLowerCase().replace(/\.$/, "");
}

function isPrivateIpv6(hostname: string) {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("::ffff:")
  );
}

export const jobUrlSchema = z
  .string()
  .trim()
  .min(1, "Enter a job URL.")
  .max(2_048, "The job URL is too long.")
  .url("Enter a valid job URL.")
  .superRefine((value, context) => {
    const url = new URL(value);
    const hostname = normalizeHostname(url.hostname);

    if (!["http:", "https:"].includes(url.protocol)) {
      context.addIssue({
        code: "custom",
        message: "Job URLs must use http or https.",
      });
    }
    if (url.username || url.password) {
      context.addIssue({
        code: "custom",
        message: "Job URLs cannot contain credentials.",
      });
    }
    if (
      blockedHostnames.has(hostname) ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      isPrivateIpv4(hostname) ||
      isPrivateIpv6(hostname)
    ) {
      context.addIssue({
        code: "custom",
        message: "Enter a publicly accessible job URL.",
      });
    }
  });

export const shareJobInputSchema = z.object({
  url: jobUrlSchema,
  title: optionalShortText(160),
  company: optionalShortText(120),
  note: optionalShortText(1_000),
});

export type ShareJobInput = z.infer<typeof shareJobInputSchema>;

export function canonicalizeJobUrl(value: string) {
  const parsed = jobUrlSchema.parse(value);
  const url = new URL(parsed);

  url.hash = "";
  url.hostname = normalizeHostname(url.hostname).replace(/^www\./, "");
  url.pathname = url.pathname.replace(/\/{2,}/g, "/");
  if (url.pathname.length > 1) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  for (const key of [...url.searchParams.keys()]) {
    const normalizedKey = key.toLowerCase();
    if (
      normalizedKey.startsWith("utm_") ||
      trackingParameters.has(normalizedKey)
    ) {
      url.searchParams.delete(key);
    }
  }
  url.searchParams.sort();

  return url.toString();
}

function humanizeSegment(value: string) {
  return decodeURIComponent(value)
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_+]+/g, " ")
    .replace(/\b\d{5,}\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getKnownBoardCompany(url: URL) {
  const segments = url.pathname.split("/").filter(Boolean);
  const host = url.hostname.replace(/^www\./, "");

  if (
    [
      "jobs.lever.co",
      "boards.greenhouse.io",
      "job-boards.greenhouse.io",
      "jobs.ashbyhq.com",
      "apply.workable.com",
    ].includes(host)
  ) {
    return segments[0] ? humanizeSegment(segments[0]) : null;
  }

  return null;
}

function getFallbackTitle(url: URL) {
  const ignoredSegments = new Set([
    "apply",
    "career",
    "careers",
    "job",
    "jobs",
    "opening",
    "openings",
    "position",
    "positions",
  ]);
  const candidates = url.pathname.split("/").filter(Boolean).reverse();
  const knownCompany = getKnownBoardCompany(url)?.toLowerCase();

  for (const candidate of candidates) {
    const humanized = humanizeSegment(candidate);
    if (
      humanized.length >= 3 &&
      /[a-z]/i.test(humanized) &&
      !ignoredSegments.has(humanized.toLowerCase()) &&
      humanized.toLowerCase() !== knownCompany &&
      !/^[a-f0-9-]{20,}$/i.test(candidate)
    ) {
      return humanized;
    }
  }

  return "Job opportunity";
}

function getFallbackCompany(url: URL) {
  const knownCompany = getKnownBoardCompany(url);
  if (knownCompany) return knownCompany;

  const hostParts = url.hostname.replace(/^www\./, "").split(".");
  const candidate = hostParts.length > 1 ? hostParts.at(-2) : hostParts[0];
  return candidate ? humanizeSegment(candidate) : "Company not provided";
}

export function extractFallbackJobDetails(
  canonicalUrl: string,
  manual: Pick<ShareJobInput, "company" | "title">,
) {
  const url = new URL(canonicalUrl);

  return {
    company: manual.company ?? getFallbackCompany(url),
    source: url.hostname,
    title: manual.title ?? getFallbackTitle(url),
  };
}
