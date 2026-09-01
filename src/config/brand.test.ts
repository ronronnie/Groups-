import { describe, expect, it } from "vitest";
import { AI_DISPLAY_NAME, APP_NAME } from "@/config/brand";

describe("brand config", () => {
  it("centralizes temporary product labels", () => {
    expect(APP_NAME).toBe("Groups");
    expect(AI_DISPLAY_NAME).toBe("Brain");
  });
});
