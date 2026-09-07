import { describe, expect, it } from "vitest";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-error";

describe("getAuthErrorMessage", () => {
  it("explains an OAuth state mismatch without exposing technical language", () => {
    expect(getAuthErrorMessage("state_mismatch")).toBe(
      "Your Google sign-in session expired or started on a different address. Please try again.",
    );
  });

  it("uses a safe generic message for unknown provider errors", () => {
    expect(getAuthErrorMessage("provider_failure")).toBe(
      "Google sign-in could not be completed. Please try again.",
    );
  });
});
