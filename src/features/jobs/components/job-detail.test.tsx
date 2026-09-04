import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { JobDetail } from "@/features/jobs/components/job-detail";
import type { GroupJobDetail } from "@/server/jobs/detail-service";
import { renderWithApp } from "@/test/render";
vi.mock("@/server/groups/admin-actions", () => ({ groupAdminAction: vi.fn() }));

vi.mock("@/server/jobs/feed-actions", () => ({
  markJobAppliedAction: vi.fn(),
  setJobDismissedAction: vi.fn(),
  setJobSavedAction: vi.fn(),
}));

vi.mock("@/server/jobs/discussion-actions", () => ({
  postJobDiscussionAction: vi.fn(),
}));

vi.mock("@/server/referrals/actions", () => ({
  createReferralRequestAction: vi.fn(),
}));

const detail: GroupJobDetail = {
  job: {
    id: "80000000-0000-4000-8000-000000000301",
    canonicalUrl: "https://example.test/jobs/designer",
    company: "Acme",
    title: "Senior Product Designer",
    descriptionSummary: "Design clear workflows for a growing product.",
    location: "Bengaluru, India",
    workMode: "hybrid",
    employmentType: "full_time",
    experienceMin: 4,
    experienceMax: 7,
    skills: ["Figma", "Research"],
    salaryText: "INR 25-35L",
    postedAt: new Date("2026-09-01T10:00:00Z"),
    source: "example.test",
    status: "active",
    shares: [
      {
        id: "80000000-0000-4000-8000-000000000401",
        sharerId: "80000000-0000-4000-8000-000000000101",
        sharerName: "Helpful Member",
        note: "I know the hiring team.",
        sharedAt: new Date("2026-09-02T10:00:00Z"),
      },
    ],
  },
  matchScore: 92,
  matchStrength: "strong",
  matchExplanation: "This role aligns with Product Designer and uses Figma.",
  saved: false,
  dismissed: false,
  applicationStatus: null,
  referralMemberCount: 1,
};

describe("JobDetail", () => {
  it("renders structured details, viewer actions, attribution, and discussion", () => {
    renderWithApp(
      <JobDetail
        detail={detail}
        groupId="80000000-0000-4000-8000-000000000201"
        groupSlug="design-jobs"
        messages={[
          {
            id: "80000000-0000-4000-8000-000000000501",
            body: "Does this team value systems work?",
            authorId: "80000000-0000-4000-8000-000000000102",
            authorName: "Group Member",
            replyToId: null,
            createdAt: new Date("2026-09-03T10:00:00Z"),
          },
        ]}
        potentialReferrers={[
          {
            userId: "80000000-0000-4000-8000-000000000101",
            displayName: "Helpful Member",
            currentCompany: "Acme",
            currentRole: "Senior Product Designer",
            sharedJob: true,
            score: 170,
            context: ["Works at Acme", "Shared this job with the group"],
            existingRequestState: null,
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Senior Product Designer" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Strong match, 92%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Mark applied" }),
    ).toBeInTheDocument();
    expect(screen.getByText("I know the hiring team.")).toBeInTheDocument();
    expect(
      screen.getByText("Does this team value systems work?"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Add to this discussion" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Request referral" }),
    ).toBeInTheDocument();
  });
});
