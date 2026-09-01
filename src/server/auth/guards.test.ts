import { describe, expect, it } from "vitest";
import { emailSchema, passwordSchema } from "@/domains/auth/validation";
import { getSafeCallbackPath } from "@/features/auth/lib/callback-path";
import { getProtectedRouteRedirect, getSignInUrl } from "@/server/auth/guards";

describe("authentication guards", () => {
  it("redirects an unauthenticated protected request to sign in", () => {
    expect(getProtectedRouteRedirect(false, "/app/settings/account")).toBe(
      "/sign-in?next=%2Fapp%2Fsettings%2Faccount",
    );
  });

  it("allows a request with a session cookie to reach authoritative checks", () => {
    expect(getProtectedRouteRedirect(true, "/app")).toBeNull();
  });

  it("does not create external return URLs", () => {
    expect(getSignInUrl("https://attacker.example")).toBe(
      "/sign-in?next=%2Fapp",
    );
    expect(getSignInUrl("//attacker.example")).toBe("/sign-in?next=%2Fapp");
    expect(getSafeCallbackPath("//attacker.example")).toBe("/app");
    expect(getSafeCallbackPath("/app/settings/account")).toBe(
      "/app/settings/account",
    );
  });
});

describe("authentication input policy", () => {
  it("normalizes email addresses", () => {
    expect(emailSchema.parse(" User@Example.COM ")).toBe("user@example.com");
  });

  it("enforces the password policy", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("alllowercase123").success).toBe(false);
    expect(passwordSchema.safeParse("ValidPassword123").success).toBe(true);
  });
});
