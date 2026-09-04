import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PageLoading } from "@/components/ui/page-loading";
import { EmptyState, ErrorState } from "@/components/ui/states";

describe("page states", () => {
  it("announces route loading without exposing skeletons", () => {
    render(<PageLoading />);

    expect(
      screen.getByRole("status", { name: "Loading page" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Loading page")).toHaveLength(1);
  });

  it("exposes an actionable error recovery control", async () => {
    const retry = vi.fn();
    const user = userEvent.setup();

    render(
      <ErrorState
        action={{ label: "Try again", onClick: retry }}
        description="The page could not be loaded."
        title="Something went wrong"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The page could not be loaded.",
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("gives empty states a clear title and next action", async () => {
    const create = vi.fn();
    const user = userEvent.setup();

    render(
      <EmptyState
        action={{ label: "Create group", onClick: create }}
        description="Start by bringing your group together."
        title="No groups yet"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "No groups yet" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Create group" }));
    expect(create).toHaveBeenCalledOnce();
  });
});
