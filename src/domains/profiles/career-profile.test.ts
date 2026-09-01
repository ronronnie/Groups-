import { describe, expect, it } from "vitest";
import {
  calculateProfileCompleteness,
  careerProfileInputSchema,
  parseCommaSeparatedList,
} from "@/domains/profiles/career-profile";

const validProfile = {
  displayName: "Riya Sharma",
  headline: "Product designer building clear, useful tools",
  currentRole: "Senior Product Designer",
  currentCompany: "Example Studio",
  yearsExperience: 8,
  location: "Bengaluru, India",
  skills: ["Product design", "Research"],
  desiredRoles: ["Design Lead"],
  preferredLocations: ["Bengaluru", "Remote"],
  remotePreference: "hybrid" as const,
  resumeUrl: "https://example.com/resume",
  portfolioUrl: "https://example.com/work",
  linkedinUrl: null,
  websiteUrl: null,
  privateNotes: "Prefer teams with strong research practices.",
  visibility: "groups" as const,
  privacySettings: {
    showCurrentCompany: false,
    showLocation: true,
    showSkills: true,
    showYearsExperience: true,
  },
};

describe("career profile validation", () => {
  it("normalizes duplicate list values and blank optional fields", () => {
    const parsed = careerProfileInputSchema.parse({
      ...validProfile,
      currentCompany: "  ",
      skills: ["Research", " research ", "Prototyping"],
    });

    expect(parsed.currentCompany).toBeNull();
    expect(parsed.skills).toEqual(["research", "Prototyping"]);
  });

  it("rejects non-web URLs and invalid experience values", () => {
    expect(
      careerProfileInputSchema.safeParse({
        ...validProfile,
        resumeUrl: "file:///private/resume.pdf",
        yearsExperience: 81,
      }).success,
    ).toBe(false);
  });

  it("parses comma and line separated form values", () => {
    expect(parseCommaSeparatedList("Design, Research\nPrototyping")).toEqual([
      "Design",
      "Research",
      "Prototyping",
    ]);
  });
});

describe("profile completeness", () => {
  it("returns 100 for all core matching fields", () => {
    expect(calculateProfileCompleteness(validProfile)).toBe(100);
  });

  it("weights missing fields without considering optional links or notes", () => {
    expect(
      calculateProfileCompleteness({
        ...validProfile,
        headline: "",
        skills: [],
        desiredRoles: [],
      }),
    ).toBe(60);
  });
});
