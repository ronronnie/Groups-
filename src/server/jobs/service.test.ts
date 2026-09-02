// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  getGroupJob,
  listGroupJobs,
  shareJob,
  type JobSqlExecutor,
} from "@/server/jobs/service";

const ids = {
  owner: "30000000-0000-4000-8000-000000000101",
  member: "30000000-0000-4000-8000-000000000102",
  outsider: "30000000-0000-4000-8000-000000000103",
  group: "30000000-0000-4000-8000-000000000201",
  otherGroup: "30000000-0000-4000-8000-000000000202",
};

function readMigrations() {
  const directory = path.resolve(process.cwd(), "drizzle");
  return readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(path.join(directory, file), "utf8"));
}

describe("job sharing service", () => {
  let client: PGlite;
  let execute: JobSqlExecutor;
  let sharedJobId: string;
  let otherJobId: string;

  beforeAll(async () => {
    client = await PGlite.create({ extensions: { vector } });
    for (const migration of readMigrations()) {
      await client.exec(migration);
    }

    await client.query(
      `insert into users (id, name, email, email_verified)
       values ($1, 'Group Owner', 'jobs-owner@example.test', true),
              ($2, 'Helpful Member', 'jobs-member@example.test', true),
              ($3, 'Other Group Member', 'jobs-outsider@example.test', true)`,
      [ids.owner, ids.member, ids.outsider],
    );
    await client.query(
      `insert into groups (id, name, slug, engine_key, owner_id)
       values ($1, 'Design Jobs', 'design-jobs-service', 'jobs', $3),
              ($2, 'Other Jobs', 'other-jobs-service', 'jobs', $4)`,
      [ids.group, ids.otherGroup, ids.owner, ids.outsider],
    );
    await client.query(
      `insert into group_memberships (group_id, user_id, role, status)
       values ($1, $2, 'owner', 'active'),
              ($1, $3, 'member', 'active'),
              ($4, $5, 'owner', 'active')`,
      [ids.group, ids.owner, ids.member, ids.otherGroup, ids.outsider],
    );

    const database = drizzle(client);
    execute = async <Row extends Record<string, unknown>>(
      query: Parameters<typeof database.execute>[0],
    ) => {
      const result = await database.execute(query);
      return { rows: result.rows as Row[] };
    };
  }, 30_000);

  afterAll(async () => {
    await client.close();
  });

  it("creates one Job object and separate attributed shares for equivalent URLs", async () => {
    const ownerShare = await shareJob(execute, {
      groupId: ids.group,
      sharerId: ids.owner,
      url: "https://www.example.com/jobs/product-designer/?utm_source=group",
      title: "Product Designer",
      company: "Example",
      note: "I know the hiring manager.",
    });
    const memberShare = await shareJob(execute, {
      groupId: ids.group,
      sharerId: ids.member,
      url: "https://example.com/jobs/product-designer#apply",
      title: null,
      company: null,
      note: "Strong design systems role.",
    });

    expect(ownerShare).toMatchObject({ shareCreated: true });
    expect(memberShare).toMatchObject({ shareCreated: true });
    expect(memberShare?.jobId).toBe(ownerShare?.jobId);
    sharedJobId = ownerShare!.jobId;

    const counts = await client.query<{ jobs: number; shares: number }>(
      `select
         (select count(*)::int from jobs) as jobs,
         (select count(*)::int from job_shares where group_id = $1) as shares`,
      [ids.group],
    );
    expect(counts.rows[0]).toEqual({ jobs: 1, shares: 2 });

    const listed = await listGroupJobs(execute, {
      groupId: ids.group,
      viewerId: ids.member,
    });
    expect(listed).toHaveLength(1);
    expect(listed?.[0]).toMatchObject({
      id: sharedJobId,
      canonicalUrl: "https://example.com/jobs/product-designer",
      company: "Example",
      title: "Product Designer",
    });
    expect(listed?.[0]?.shares.map((share) => share.sharerName)).toEqual([
      "Helpful Member",
      "Group Owner",
    ]);
  });

  it("reuses a member's existing share and updates its note", async () => {
    await expect(
      shareJob(execute, {
        groupId: ids.group,
        sharerId: ids.member,
        url: "https://example.com/jobs/product-designer?gclid=tracking",
        title: null,
        company: null,
        note: "Updated note.",
      }),
    ).resolves.toMatchObject({ jobId: sharedJobId, shareCreated: false });

    const shares = await client.query<{ count: number; note: string }>(
      `select count(*)::int as count, max(note) as note
       from job_shares
       where group_id = $1 and job_id = $2 and sharer_id = $3`,
      [ids.group, sharedJobId, ids.member],
    );
    expect(shares.rows[0]).toEqual({ count: 1, note: "Updated note." });
  });

  it("persists reviewed structured fields without replacing established identity fields", async () => {
    await shareJob(execute, {
      groupId: ids.group,
      sharerId: ids.member,
      url: "https://example.com/jobs/product-designer",
      title: "Untrusted replacement title",
      company: "Untrusted replacement company",
      note: "Reviewed details.",
      reviewedJob: {
        url: "https://example.com/jobs/product-designer",
        title: "Untrusted replacement title",
        company: "Untrusted replacement company",
        descriptionSummary: "Lead product design across a growing platform.",
        location: "Bengaluru, India",
        workMode: "hybrid",
        employmentType: "full_time",
        experienceMin: 4,
        experienceMax: 7,
        skills: ["Figma", "Product strategy"],
        salaryText: "INR 30-40L",
        note: "Reviewed details.",
      },
    });

    const job = await getGroupJob(execute, {
      groupId: ids.group,
      jobId: sharedJobId,
      viewerId: ids.owner,
    });
    expect(job).toMatchObject({
      title: "Product Designer",
      company: "Example",
      descriptionSummary: "Lead product design across a growing platform.",
      location: "Bengaluru, India",
      workMode: "hybrid",
      employmentType: "full_time",
      experienceMin: 4,
      experienceMax: 7,
      skills: ["Figma", "Product strategy"],
      salaryText: "INR 30-40L",
    });
  });

  it("rejects sharing by a non-member", async () => {
    await expect(
      shareJob(execute, {
        groupId: ids.group,
        sharerId: ids.outsider,
        url: "https://example.com/jobs/unauthorized-role",
        title: null,
        company: null,
        note: null,
      }),
    ).resolves.toBeNull();

    const jobs = await client.query<{ count: number }>(
      "select count(*)::int as count from jobs where canonical_url like '%unauthorized%'",
    );
    expect(jobs.rows[0]?.count).toBe(0);
  });

  it("keeps list and detail access scoped to the active group", async () => {
    const otherShare = await shareJob(execute, {
      groupId: ids.otherGroup,
      sharerId: ids.outsider,
      url: "https://other.example.com/jobs/researcher",
      title: "Design Researcher",
      company: "Other Example",
      note: "Other group only.",
    });
    otherJobId = otherShare!.jobId;

    await expect(
      listGroupJobs(execute, {
        groupId: ids.group,
        viewerId: ids.outsider,
      }),
    ).resolves.toBeNull();
    await expect(
      getGroupJob(execute, {
        groupId: ids.group,
        jobId: otherJobId,
        viewerId: ids.member,
      }),
    ).resolves.toBeNull();
    await expect(
      getGroupJob(execute, {
        groupId: ids.group,
        jobId: sharedJobId,
        viewerId: ids.outsider,
      }),
    ).resolves.toBeNull();

    const visible = await getGroupJob(execute, {
      groupId: ids.group,
      jobId: sharedJobId,
      viewerId: ids.owner,
    });
    expect(visible?.shares).toHaveLength(2);
    expect(
      visible?.shares.every((share) => share.note !== "Other group only."),
    ).toBe(true);
  });
});
