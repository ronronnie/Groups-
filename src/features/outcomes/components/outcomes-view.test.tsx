import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RecordOutcomeForm,
  OutcomeSharingForm,
} from "@/features/outcomes/components/outcome-forms";
import { OutcomesView } from "@/features/outcomes/components/outcomes-view";
import {
  recordOutcomeAction,
  changeOutcomeVisibilityAction,
} from "@/server/outcomes/actions";
import type { OutcomeItem } from "@/server/outcomes/service";

vi.mock("@/server/outcomes/actions", () => ({
  recordOutcomeAction: vi.fn(async () => ({
    status: "success",
    message: "Milestone saved privately. Nothing was announced.",
  })),
  changeOutcomeVisibilityAction: vi.fn(async () => ({
    status: "success",
    message: "Outcome shared with this group.",
  })),
}));
vi.mock("@/components/motion/celebration", () => ({
  Celebration: () => <div role="img" aria-label="Celebration" />,
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const outcome: OutcomeItem = {
  id: "outcome",
  jobId: "job",
  subjectUserId: "candidate",
  subjectName: "Candidate",
  title: "Engineer",
  company: "Example Co",
  outcomeType: "interview",
  visibility: "private",
  sharerName: "Sharer",
  referrerName: "Referrer",
};

describe("outcome UI", () => {
  it("keeps confirmation and optional attribution unchecked and saves privately", async () => {
    const user = userEvent.setup();
    render(
      <RecordOutcomeForm
        applicationId="application"
        groupSlug="first"
        milestones={["interview"]}
      />,
    );
    for (const checkbox of screen.getAllByRole("checkbox"))
      expect(checkbox).not.toBeChecked();
    await user.click(
      screen.getByLabelText("I confirm this milestone happened to me."),
    );
    await user.click(screen.getByRole("button", { name: "Save privately" }));
    await waitFor(() => expect(recordOutcomeAction).toHaveBeenCalledOnce());
    expect(await screen.findByRole("status")).toHaveTextContent(
      "saved privately",
    );
    expect(
      screen.getByRole("img", { name: "Celebration" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Review outcome" }),
    ).toHaveAttribute("href", "/app/groups/first/outcomes");
    expect(changeOutcomeVisibilityAction).not.toHaveBeenCalled();
  });

  it("keeps the save pending until the action resolves, then renders success", async () => {
    const user = userEvent.setup();
    let finishSave!: (
      value: Awaited<ReturnType<typeof recordOutcomeAction>>,
    ) => void;
    const saveResult = new Promise<
      Awaited<ReturnType<typeof recordOutcomeAction>>
    >((resolve) => {
      finishSave = resolve;
    });
    vi.mocked(recordOutcomeAction).mockReturnValueOnce(saveResult);
    render(
      <RecordOutcomeForm
        applicationId="application"
        groupSlug="first"
        milestones={["interview"]}
      />,
    );
    await user.click(
      screen.getByLabelText("I confirm this milestone happened to me."),
    );
    await user.click(screen.getByRole("button", { name: "Save privately" }));
    await waitFor(() => expect(recordOutcomeAction).toHaveBeenCalledOnce());
    expect(
      await screen.findByRole("button", { name: "Saving" }),
    ).toBeDisabled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    await act(async () => {
      finishSave({
        status: "success",
        message: "Milestone saved privately. Nothing was announced.",
      });
      await saveResult;
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "saved privately",
    );
    expect(
      screen.queryByRole("button", { name: "Saving" }),
    ).not.toBeInTheDocument();
    expect(changeOutcomeVisibilityAction).not.toHaveBeenCalled();
  });

  it("requires fresh consent, names what is shared, and shows attribution before sharing", async () => {
    const user = userEvent.setup();
    render(
      <OutcomesView
        outcomes={[outcome]}
        userId="candidate"
        groupSlug="first"
        scope="mine"
      />,
    );
    expect(screen.getByText("Sharer")).toBeInTheDocument();
    expect(screen.getByText("Referrer")).toBeInTheDocument();
    const consent = screen.getByRole("checkbox");
    expect(consent).not.toBeChecked();
    expect(consent).toBeRequired();
    await user.click(screen.getByRole("button", { name: "Share with group" }));
    expect(changeOutcomeVisibilityAction).not.toHaveBeenCalled();
    await user.click(consent);
    await user.click(screen.getByRole("button", { name: "Share with group" }));
    await waitFor(() =>
      expect(changeOutcomeVisibilityAction).toHaveBeenCalledOnce(),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Outcome shared with this group.",
    );
  });

  it("does not give other members sharing controls", () => {
    render(
      <OutcomesView
        outcomes={[{ ...outcome, visibility: "group" }]}
        userId="viewer"
        groupSlug="first"
        scope="group"
      />,
    );
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Make private" }),
    ).not.toBeInTheDocument();
  });

  it("allows owners to withdraw sharing without a consent checkbox", () => {
    render(<OutcomeSharingForm groupSlug="first" outcomeId="outcome" shared />);
    expect(
      screen.getByRole("button", { name: "Make private" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
