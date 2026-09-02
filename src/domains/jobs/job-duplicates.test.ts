import { describe, expect, it } from "vitest";
import { detectDuplicateJob } from "@/domains/jobs/job-duplicates";

const candidates = [
  {
    id: "job-1",
    canonicalUrl: "https://example.com/jobs/product-designer",
    company: "Acme, Inc.",
    title: "Senior Product Designer",
    location: "Bengaluru, India",
  },
  {
    id: "job-2",
    canonicalUrl: "https://example.com/jobs/backend-engineer",
    company: "Acme, Inc.",
    title: "Backend Engineer",
    location: "Remote",
  },
];

describe("job duplicate detection", () => {
  it("detects canonical URL duplicates despite tracking parameters", () => {
    expect(
      detectDuplicateJob(
        {
          canonicalUrl:
            "https://www.example.com/jobs/product-designer/?utm_source=group#apply",
          company: "Different extraction",
          title: "Different extraction",
          location: "",
        },
        candidates,
      ),
    ).toMatchObject({ id: "job-1", kind: "exact", score: 100 });
  });

  it("detects a near duplicate using company, title, and location", () => {
    expect(
      detectDuplicateJob(
        {
          canonicalUrl: "https://careers.acme.test/design/456",
          company: "Acme Inc",
          title: "Product Designer",
          location: "Bengaluru",
        },
        candidates,
      ),
    ).toMatchObject({
      id: "job-1",
      kind: "near",
      confidence: "strong",
    });
  });

  it("does not conflate different roles or companies", () => {
    expect(
      detectDuplicateJob(
        {
          canonicalUrl: "https://elsewhere.test/jobs/1",
          company: "Other Company",
          title: "Product Designer",
          location: "Bengaluru",
        },
        candidates,
      ),
    ).toBeNull();
    expect(
      detectDuplicateJob(
        {
          canonicalUrl: "https://example.test/jobs/2",
          company: "Acme Inc",
          title: "Finance Manager",
          location: "Bengaluru",
        },
        candidates,
      ),
    ).toBeNull();
  });
});
