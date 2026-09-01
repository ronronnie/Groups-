import { describe, expect, it } from "vitest";
import { jobsReferralsEngine } from "@/domains/jobs/engine";
import {
  enabledGroupEngineKeys,
  getGroupEngine,
  getGroupEngineNavigation,
  groupEngineRegistry,
} from "@/domains/groups/registry";

describe("group engine registry", () => {
  it("looks up the Jobs & Referrals engine by its canonical key", () => {
    expect(getGroupEngine("jobs")).toBe(jobsReferralsEngine);
    expect(getGroupEngine("jobs")?.key).toBe("jobs");
  });

  it("enables only the jobs engine", () => {
    expect(enabledGroupEngineKeys).toEqual(["jobs"]);
    expect(Object.keys(groupEngineRegistry)).toEqual(["jobs"]);
  });

  it("handles unknown engine keys without exposing a partial engine", () => {
    expect(getGroupEngine("travel")).toBeNull();
    expect(getGroupEngine(undefined)).toBeNull();
    expect(getGroupEngineNavigation("travel", "/groups/example")).toEqual([]);
  });

  it("generates ordered group navigation from the engine contract", () => {
    expect(getGroupEngineNavigation("jobs", "/groups/design-jobs/")).toEqual([
      {
        id: "for-you",
        label: "For You",
        hrefSegment: "for-you",
        href: "/groups/design-jobs/for-you",
      },
      {
        id: "jobs",
        label: "Jobs",
        hrefSegment: "jobs",
        href: "/groups/design-jobs/jobs",
      },
      {
        id: "tracker",
        label: "Tracker",
        hrefSegment: "tracker",
        href: "/groups/design-jobs/tracker",
      },
      {
        id: "people",
        label: "People",
        hrefSegment: "people",
        href: "/groups/design-jobs/people",
      },
      {
        id: "chat",
        label: "Chat",
        hrefSegment: "chat",
        href: "/groups/design-jobs/chat",
      },
    ]);
  });
});
