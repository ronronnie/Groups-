import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReferralInbox } from "@/features/referrals/components/referral-inbox";
import type { ReferralRequestItem } from "@/server/referrals/service";
import { renderWithApp } from "@/test/render";

vi.mock("@/server/referrals/actions", () => ({
  transitionReferralRequestAction: vi.fn(),
}));

afterEach(cleanup);

const request: ReferralRequestItem = {
  id: "83000000-0000-4000-8000-000000000401",
  requesterId: "83000000-0000-4000-8000-000000000101",
  requesterName: "Requesting Member",
  requesterContext: "Product Designer",
  potentialReferrerId: "83000000-0000-4000-8000-000000000102",
  potentialReferrerName: "Helpful Member",
  referrerContext: ["Works at Acme"],
  jobId: "83000000-0000-4000-8000-000000000301",
  jobTitle: "Senior Product Designer",
  company: "Acme",
  message: "Would you be comfortable considering a referral for me?",
  state: "requested",
  createdAt: new Date("2026-09-03T08:00:00Z"),
  updatedAt: new Date("2026-09-03T08:00:00Z"),
  timeline: [
    {
      id: "83000000-0000-4000-8000-000000000501",
      fromState: null,
      toState: "requested",
      changedByName: "Requesting Member",
      note: null,
      createdAt: new Date("2026-09-03T08:00:00Z"),
    },
  ],
};

describe("ReferralInbox", () => {
  it("shows incoming actions and private status history to the referrer", () => {
    renderWithApp(
      <ReferralInbox
        groupId="83000000-0000-4000-8000-000000000201"
        groupSlug="design-jobs"
        requests={[request]}
        viewerId={request.potentialReferrerId}
        viewerRole="member"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Incoming" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ask for info" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Private referral context")).toBeInTheDocument();
    expect(screen.getByText("Status history (1)")).toBeInTheDocument();
  });

  it("gives admins read-only visibility when they are not a participant", () => {
    renderWithApp(
      <ReferralInbox
        groupId="83000000-0000-4000-8000-000000000201"
        groupSlug="design-jobs"
        requests={[request]}
        viewerId="83000000-0000-4000-8000-000000000103"
        viewerRole="admin"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Group requests" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();
    expect(
      screen.getByText("Requesting Member and Helpful Member"),
    ).toBeInTheDocument();
  });
});
