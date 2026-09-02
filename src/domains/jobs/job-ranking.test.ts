import { describe, expect, it } from "vitest";
import { explainJobMatch } from "@/domains/jobs/job-explanation";
import {
  rankJobMatch,
  type MatchCandidate,
  type MatchProfile,
} from "@/domains/jobs/job-ranking";

const now = new Date("2026-09-02T12:00:00.000Z");
const profile: MatchProfile = {
  desiredRoles: ["Product Designer"],
  skills: ["Figma", "User research", "Design systems"],
  yearsExperience: 5,
  preferredLocations: ["Bengaluru"],
  remotePreference: "hybrid",
};
const candidate: MatchCandidate = {
  title: "Senior Product Designer",
  skills: ["Figma", "Design systems"],
  experienceMin: 4,
  experienceMax: 7,
  location: "Bengaluru, India",
  workMode: "hybrid",
  sharedAt: new Date("2026-09-01T12:00:00.000Z"),
  saved: false,
  dismissed: false,
  applicationStatus: null,
};

describe("job match ranking", () => {
  it("ranks a strong role, skill, experience, location, and mode match", () => {
    const match = rankJobMatch(profile, candidate, now);

    expect(match).toMatchObject({
      score: 100,
      strength: "strong",
      matchedRoles: ["Product Designer"],
      matchedSkills: ["Figma", "Design systems"],
      matchedLocations: ["Bengaluru"],
    });
    expect(explainJobMatch(profile, candidate, match)).toBe(
      "This role aligns with Product Designer and uses Figma and Design systems.",
    );
  });

  it("ranks weakly related work below a relevant role", () => {
    const weak = rankJobMatch(
      profile,
      {
        ...candidate,
        title: "Backend Engineer",
        skills: ["Go", "PostgreSQL"],
        location: "London",
        workMode: "onsite",
      },
      now,
    );
    const strong = rankJobMatch(profile, candidate, now);

    expect(strong.score).toBeGreaterThan(weak.score);
    expect(weak.strength).toBe("possible");
  });

  it("combines recency and viewer state without exceeding score bounds", () => {
    const old = rankJobMatch(
      profile,
      { ...candidate, sharedAt: new Date("2025-01-01T00:00:00.000Z") },
      now,
    );
    const saved = rankJobMatch(profile, { ...candidate, saved: true }, now);
    const applied = rankJobMatch(
      profile,
      { ...candidate, applicationStatus: "applied" },
      now,
    );
    const dismissed = rankJobMatch(
      profile,
      { ...candidate, dismissed: true },
      now,
    );

    expect(saved.score).toBe(100);
    expect(old.score).toBeLessThan(saved.score);
    expect(applied.score).toBeLessThan(old.score);
    expect(dismissed.score).toBe(0);
  });

  it("uses a restrained fallback explanation for sparse jobs", () => {
    const sparse = {
      ...candidate,
      title: "Opportunity",
      skills: [],
      experienceMin: null,
      experienceMax: null,
      location: "",
      workMode: "unspecified" as const,
    };
    const match = rankJobMatch(profile, sparse, now);

    expect(explainJobMatch(profile, sparse, match)).toContain(
      "limited matching detail",
    );
  });
});
