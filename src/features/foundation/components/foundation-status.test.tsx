import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithApp } from "@/test/render";
import { FoundationStatus } from "./foundation-status";

describe("FoundationStatus", () => {
  it("renders the minimal application foundation page", () => {
    renderWithApp(<FoundationStatus />);

    expect(
      screen.getByRole("heading", {
        name: /purpose-native groups, ready for implementation/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /health endpoint/i }),
    ).toHaveAttribute("href", "/api/health");
  });
});
