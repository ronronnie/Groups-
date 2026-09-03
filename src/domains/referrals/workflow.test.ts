import { describe, expect, it } from "vitest";
import {
  canTransitionReferral,
  rankPotentialReferrers,
} from "@/domains/referrals/workflow";

describe("referral workflow", () => {
  it("ranks only relevant candidates and limits outreach", () => {
    const ranked = rankPotentialReferrers(
      { company: "Acme", title: "Senior Product Designer" },
      [
        {
          userId: "company-match",
          displayName: "Company Match",
          currentCompany: "ACME",
          currentRole: "Product Designer",
          sharedJob: false,
        },
        {
          userId: "sharer",
          displayName: "Job Sharer",
          currentCompany: null,
          currentRole: null,
          sharedJob: true,
        },
        {
          userId: "role-match",
          displayName: "Role Match",
          currentCompany: "Other",
          currentRole: "Product Researcher",
          sharedJob: false,
        },
        {
          userId: "irrelevant",
          displayName: "Irrelevant",
          currentCompany: "Elsewhere",
          currentRole: "Accountant",
          sharedJob: false,
        },
      ],
      2,
    );

    expect(ranked.map((candidate) => candidate.userId)).toEqual([
      "company-match",
      "sharer",
    ]);
    expect(ranked[0]?.context).toEqual([
      "Works at ACME",
      "Relevant role: Product Designer",
    ]);
    expect(JSON.stringify(ranked)).not.toContain("Irrelevant");
  });

  it("enforces party-specific state transitions", () => {
    expect(canTransitionReferral("referrer", "requested", "accepted")).toBe(
      true,
    );
    expect(canTransitionReferral("requester", "requested", "accepted")).toBe(
      false,
    );
    expect(canTransitionReferral("requester", "needs_info", "requested")).toBe(
      true,
    );
    expect(canTransitionReferral("referrer", "accepted", "referred")).toBe(
      true,
    );
    expect(canTransitionReferral("referrer", "closed", "accepted")).toBe(false);
  });
});
