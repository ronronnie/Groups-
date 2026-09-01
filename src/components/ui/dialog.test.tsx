import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";
import { Drawer, Modal } from "@/components/ui/dialog";

describe("overlay components", () => {
  it("opens and dismisses a modal with the keyboard", async () => {
    const user = userEvent.setup();

    render(
      <Modal title="Save role" trigger={<Button>Open modal</Button>}>
        <p>Private application details</p>
      </Modal>,
    );

    await user.click(screen.getByRole("button", { name: "Open modal" }));
    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: "Save role" })).toBeVisible(),
    );

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Save role" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("provides an accessible drawer title and close control", async () => {
    const user = userEvent.setup();

    render(
      <Drawer title="Match details" trigger={<Button>Open drawer</Button>}>
        <p>Contextual details</p>
      </Drawer>,
    );

    await user.click(screen.getByRole("button", { name: "Open drawer" }));
    await waitFor(() =>
      expect(
        screen.getByRole("dialog", { name: "Match details" }),
      ).toBeVisible(),
    );

    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Match details" }),
      ).not.toBeInTheDocument(),
    );
  });
});
