import { describe, expect, it } from "vitest";
import {
  canonicalizeJobUrl,
  extractFallbackJobDetails,
  jobUrlSchema,
  shareJobInputSchema,
} from "@/domains/jobs/job-sharing";

describe("job URL validation and canonicalization", () => {
  it("normalizes host, path, parameters, fragments, and tracking data", () => {
    expect(
      canonicalizeJobUrl(
        "HTTPS://WWW.Example.COM:443/jobs/senior-designer///?utm_source=chat&job=42&b=2#apply",
      ),
    ).toBe("https://example.com/jobs/senior-designer?b=2&job=42");
  });

  it("rejects non-web, credentialed, and local URLs", () => {
    expect(jobUrlSchema.safeParse("file:///tmp/job.html").success).toBe(false);
    expect(
      jobUrlSchema.safeParse("https://user:pass@example.com/job").success,
    ).toBe(false);
    expect(jobUrlSchema.safeParse("http://127.0.0.1/job").success).toBe(false);
    expect(jobUrlSchema.safeParse("http://[::1]/job").success).toBe(false);
    expect(jobUrlSchema.safeParse("https://jobs.internal/role").success).toBe(
      false,
    );
  });

  it("normalizes optional manual fields", () => {
    const parsed = shareJobInputSchema.parse({
      url: "https://example.com/jobs/product-designer",
      title: "  Product Designer ",
      company: " ",
      note: " Worth a look. ",
    });

    expect(parsed).toMatchObject({
      title: "Product Designer",
      company: null,
      note: "Worth a look.",
    });
  });
});

describe("deterministic job fallback extraction", () => {
  it("derives a useful title and company from a conventional URL", () => {
    expect(
      extractFallbackJobDetails(
        "https://careers.acme.com/jobs/senior-product-designer-123456",
        { company: null, title: null },
      ),
    ).toEqual({
      company: "Acme",
      source: "careers.acme.com",
      title: "Senior Product Designer",
    });
  });

  it("recognizes company slugs on common job boards without inventing a title", () => {
    expect(
      extractFallbackJobDetails(
        "https://jobs.lever.co/acme/abcdef0123456789abcdef0123456789",
        { company: null, title: null },
      ),
    ).toEqual({
      company: "Acme",
      source: "jobs.lever.co",
      title: "Job opportunity",
    });
  });

  it("prefers reviewed manual labels", () => {
    expect(
      extractFallbackJobDetails("https://example.com/openings/123456", {
        company: "Northstar",
        title: "Design Lead",
      }),
    ).toMatchObject({ company: "Northstar", title: "Design Lead" });
  });
});
