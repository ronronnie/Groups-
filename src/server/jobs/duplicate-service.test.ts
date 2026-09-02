// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  findGroupJobDuplicate,
  shareJob,
  type JobSqlExecutor,
} from "@/server/jobs/service";

const ids = {
  owner: "70000000-0000-4000-8000-000000000101",
  member: "70000000-0000-4000-8000-000000000102",
  outsider: "70000000-0000-4000-8000-000000000103",
  group: "70000000-0000-4000-8000-000000000201",
  otherGroup: "70000000-0000-4000-8000-000000000202",
  job: "70000000-0000-4000-8000-000000000301",
};

function readMigrations() {
  const directory = path.resolve(process.cwd(), "drizzle");
  return readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(path.join(directory, file), "utf8"));
}

describe("group job duplicate assistance", () => {
  let client: PGlite;
  let execute: JobSqlExecutor;

  beforeAll(async () => {
    client = await PGlite.create({ extensions: { vector } });
    for (const migration of readMigrations()) await client.exec(migration);

    await client.query(
      `insert into users (id, name, email, email_verified)
       values ($1, 'Original Sharer', 'duplicate-owner@example.test', true),
              ($2, 'Second Sharer', 'duplicate-member@example.test', true),
              ($3, 'Outsider', 'duplicate-outsider@example.test', true)`,
      [ids.owner, ids.member, ids.outsider],
    );
    await client.query(
      `insert into groups (id, name, slug, engine_key, owner_id)
       values ($1, 'Duplicate Jobs', 'duplicate-jobs', 'jobs', $3),
              ($2, 'Other Jobs', 'duplicate-other', 'jobs', $4)`,
      [ids.group, ids.otherGroup, ids.owner, ids.outsider],
    );
    await client.query(
      `insert into group_memberships (group_id, user_id, role, status)
       values ($1, $2, 'owner', 'active'),
              ($1, $3, 'member', 'active'),
              ($4, $5, 'owner', 'active')`,
      [ids.group, ids.owner, ids.member, ids.otherGroup, ids.outsider],
    );
    await client.query(
      `insert into jobs (
         id, canonical_url, company, title, location, source
       ) values (
         $1, 'https://example.test/jobs/product-designer', 'Acme Inc',
         'Senior Product Designer', 'Bengaluru, India', 'example.test'
       )`,
      [ids.job],
    );
    await client.query(
      `insert into job_shares (group_id, job_id, sharer_id, note)
       values ($1, $2, $3, 'Original context')`,
      [ids.group, ids.job, ids.owner],
    );

    const database = drizzle(client);
    execute = async <Row extends Record<string, unknown>>(
      query: Parameters<typeof database.execute>[0],
    ) => {
      const result = await database.execute(query);
      return { rows: result.rows as Row[] };
    };
  }, 30_000);

  afterAll(async () => client.close());

  it("finds exact and near duplicates only for active group members", async () => {
    await expect(
      findGroupJobDuplicate(execute, {
        groupId: ids.group,
        viewerId: ids.member,
        url: "https://www.example.test/jobs/product-designer?utm_source=chat",
        title: "Anything",
        company: "Anything",
        location: "",
      }),
    ).resolves.toMatchObject({ id: ids.job, kind: "exact" });
    await expect(
      findGroupJobDuplicate(execute, {
        groupId: ids.group,
        viewerId: ids.member,
        url: "https://careers.acme.test/openings/123",
        title: "Product Designer",
        company: "Acme Inc.",
        location: "Bengaluru",
      }),
    ).resolves.toMatchObject({ id: ids.job, kind: "near" });
    await expect(
      findGroupJobDuplicate(execute, {
        groupId: ids.group,
        viewerId: ids.outsider,
        url: "https://example.test/jobs/product-designer",
        title: "Product Designer",
        company: "Acme Inc",
        location: "Bengaluru",
      }),
    ).resolves.toBeNull();
  });

  it("reuses a selected near duplicate and preserves every sharer attribution", async () => {
    await expect(
      shareJob(execute, {
        groupId: ids.group,
        sharerId: ids.member,
        reuseJobId: ids.job,
        url: "https://careers.acme.test/openings/123",
        title: "Product Designer",
        company: "Acme Inc",
        note: "Second member context",
      }),
    ).resolves.toMatchObject({
      jobId: ids.job,
      reusedExisting: true,
      shareCreated: true,
    });

    const records = await client.query<{
      jobs: number;
      shares: number;
      originalNotes: number;
      secondNotes: number;
    }>(
      `select
         (select count(*)::int from jobs) as jobs,
         count(*)::int as shares,
         count(*) filter (where note = 'Original context')::int as "originalNotes",
         count(*) filter (where note = 'Second member context')::int as "secondNotes"
       from job_shares
       where group_id = $1 and job_id = $2`,
      [ids.group, ids.job],
    );
    expect(records.rows[0]).toEqual({
      jobs: 1,
      shares: 2,
      originalNotes: 1,
      secondNotes: 1,
    });
  });

  it("rejects reuse when the selected job is outside the caller's group", async () => {
    await expect(
      shareJob(execute, {
        groupId: ids.otherGroup,
        sharerId: ids.outsider,
        reuseJobId: ids.job,
        url: "https://careers.acme.test/openings/123",
        title: "Product Designer",
        company: "Acme Inc",
        note: null,
      }),
    ).resolves.toBeNull();
  });
});
