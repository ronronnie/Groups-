import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithApp } from "@/test/render";
import { HomePage } from "./home-page";

describe("HomePage", () => {
  it("explains the product and gives visitors clear account paths", () => {
    renderWithApp(<HomePage />);

    expect(
      screen.getByRole("heading", {
        name: /find your next job with help from your people/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create your group" }),
    ).toHaveAttribute("href", "/sign-up");
    expect(
      screen.getByRole("link", { name: "I already have an account" }),
    ).toHaveAttribute("href", "/sign-in");
    expect(screen.queryByText(/engineering foundation/i)).toBeNull();
    expect(screen.queryByText(/health endpoint/i)).toBeNull();
  });
});
