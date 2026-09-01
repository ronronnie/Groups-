import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SegmentedControl } from "@/components/ui/segmented-control";

describe("SegmentedControl", () => {
  it("supports click and arrow-key selection", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <SegmentedControl
        ariaLabel="Job view"
        defaultValue="recommended"
        onValueChange={onValueChange}
        options={[
          { label: "Recommended", value: "recommended" },
          { label: "Recent", value: "recent" },
          { label: "Saved", value: "saved" },
        ]}
      />,
    );

    const recommended = screen.getByRole("radio", { name: "Recommended" });
    const recent = screen.getByRole("radio", { name: "Recent" });

    recommended.focus();
    await user.keyboard("{ArrowRight}");

    expect(recent).toHaveFocus();
    expect(recent).toHaveAttribute("aria-checked", "true");
    expect(onValueChange).toHaveBeenLastCalledWith("recent");

    await user.click(screen.getByRole("radio", { name: "Saved" }));
    expect(onValueChange).toHaveBeenLastCalledWith("saved");
  });
});
