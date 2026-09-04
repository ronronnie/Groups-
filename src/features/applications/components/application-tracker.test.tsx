import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApplicationTracker } from "@/features/applications/components/application-tracker";
import type { ApplicationTrackerItem } from "@/server/applications/service";

vi.mock("@/server/applications/actions", () => ({
  updateApplicationDetailsAction: vi.fn(),
  updateApplicationStatusAction: vi.fn(),
}));
vi.mock("@/server/outcomes/actions", () => ({
  recordOutcomeAction: vi.fn(),
  changeOutcomeVisibilityAction: vi.fn(),
}));

afterEach(cleanup);

const application: ApplicationTrackerItem = {
  id: "82000000-0000-4000-8000-000000000101",
  jobId: "82000000-0000-4000-8000-000000000201",
  company: "Acme",
  title: "Product Designer",
  location: "Bengaluru",
  canonicalUrl: "https://jobs.example.test/product-designer",
  status: "interviewing",
  privateNotes: "Prepare the case study.",
  nextAction: "Send availability",
  nextActionDate: "2026-09-08",
  appliedAt: new Date("2026-09-01T09:00:00Z"),
  updatedAt: new Date("2026-09-02T09:00:00Z"),
  timeline: [
    {
      id: "82000000-0000-4000-8000-000000000301",
      fromStatus: "applied",
      toStatus: "interviewing",
      createdAt: new Date("2026-09-02T09:00:00Z"),
    },
  ],
};

describe("ApplicationTracker", () => {
  it("renders the private board with every status lane", () => {
    render(
      <ApplicationTracker
        applications={[application]}
        filter="all"
        groupId="82000000-0000-4000-8000-000000000401"
        groupSlug="design-jobs"
        view="board"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Application tracker" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Stages, notes, and next actions are visible only to you.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Saved" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Interviewing" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Product Designer" }),
    ).toHaveAttribute(
      "href",
      "/app/groups/design-jobs/jobs/82000000-0000-4000-8000-000000000201",
    );
    expect(screen.getByText("Send availability")).toBeInTheDocument();
  });

  it("renders the list view and filtered empty state", () => {
    const { rerender } = render(
      <ApplicationTracker
        applications={[application]}
        filter="interviewing"
        groupId="82000000-0000-4000-8000-000000000401"
        groupSlug="design-jobs"
        view="list"
      />,
    );

    expect(screen.getByRole("link", { name: "Open job" })).toHaveAttribute(
      "href",
      "https://jobs.example.test/product-designer",
    );

    rerender(
      <ApplicationTracker
        applications={[]}
        filter="offer"
        groupId="82000000-0000-4000-8000-000000000401"
        groupSlug="design-jobs"
        view="list"
      />,
    );
    expect(
      screen.getByRole("heading", { name: "No matches" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("You have no offer applications in this group."),
    ).toBeInTheDocument();
  });
});
