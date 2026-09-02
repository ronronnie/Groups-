// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createJobDiscussionMessage,
  listJobDiscussion,
} from "@/server/jobs/discussion-service";
import { getGroupJobDetail } from "@/server/jobs/detail-service";
import type { JobSqlExecutor } from "@/server/jobs/service";

const ids = {
  owner: "60000000-0000-4000-8000-000000000101",
  member: "60000000-0000-4000-8000-000000000102",
  outsider: "60000000-0000-4000-8000-000000000103",
  group: "60000000-0000-4000-8000-000000000201",
  otherGroup: "60000000-0000-4000-8000-000000000202",
  job: "60000000-0000-4000-8000-000000000301",
};

function readMigrations() {
  const directory = path.resolve(process.cwd(), "drizzle");
  return readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(path.join(directory, file), "utf8"));
}

describe("job discussion service", () => {
  let client: PGlite;
  let execute: JobSqlExecutor;

  beforeAll(async () => {
    client = await PGlite.create({ extensions: { vector } });
    for (const migration of readMigrations()) await client.exec(migration);

    await client.query(
      `insert into users (id, name, email, email_verified)
       values ($1, 'Job Owner', 'discussion-owner@example.test', true),
              ($2, 'Group Member', 'discussion-member@example.test', true),
              ($3, 'Outsider', 'discussion-outsider@example.test', true)`,
      [ids.owner, ids.member, ids.outsider],
    );
    await client.query(
      `insert into groups (id, name, slug, engine_key, owner_id)
       values ($1, 'Discussion Jobs', 'discussion-jobs', 'jobs', $3),
              ($2, 'Other Group', 'discussion-other', 'jobs', $4)`,
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
      `insert into jobs (id, canonical_url, company, title, source)
       values ($1, 'https://example.test/discuss', 'Example', 'Product Designer', 'example.test')`,
      [ids.job],
    );
    await client.query(
      `insert into job_shares (group_id, job_id, sharer_id)
       values ($1, $2, $3)`,
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

  it("creates one job-bound thread and lists messages in order", async () => {
    const first = await createJobDiscussionMessage(execute, {
      groupId: ids.group,
      jobId: ids.job,
      authorId: ids.member,
      body: "  Does the team value systems work?  ",
    });
    const second = await createJobDiscussionMessage(execute, {
      groupId: ids.group,
      jobId: ids.job,
      authorId: ids.owner,
      body: "Yes, include one end-to-end case study.",
    });

    expect(first).toMatchObject({
      authorName: "Group Member",
      body: "Does the team value systems work?",
    });
    expect(second?.authorName).toBe("Job Owner");
    await expect(
      listJobDiscussion(execute, {
        groupId: ids.group,
        jobId: ids.job,
        viewerId: ids.member,
      }),
    ).resolves.toMatchObject([
      { body: "Does the team value systems work?" },
      { body: "Yes, include one end-to-end case study." },
    ]);

    const threads = await client.query<{ count: number }>(
      `select count(*)::int as count
       from message_threads
       where group_id = $1 and job_id = $2 and kind = 'job'`,
      [ids.group, ids.job],
    );
    expect(threads.rows[0]?.count).toBe(1);
  });

  it("rejects discussion reads and writes outside active group membership", async () => {
    await expect(
      createJobDiscussionMessage(execute, {
        groupId: ids.group,
        jobId: ids.job,
        authorId: ids.outsider,
        body: "This must not be written.",
      }),
    ).resolves.toBeNull();
    await expect(
      createJobDiscussionMessage(execute, {
        groupId: ids.otherGroup,
        jobId: ids.job,
        authorId: ids.outsider,
        body: "This job is not shared here.",
      }),
    ).resolves.toBeNull();
    await expect(
      listJobDiscussion(execute, {
        groupId: ids.group,
        jobId: ids.job,
        viewerId: ids.outsider,
      }),
    ).resolves.toBeNull();

    const messages = await client.query<{ count: number }>(
      "select count(*)::int as count from messages",
    );
    expect(messages.rows[0]?.count).toBe(2);
  });

  it("returns job detail only to active members of the sharing group", async () => {
    await expect(
      getGroupJobDetail(execute, {
        groupId: ids.group,
        jobId: ids.job,
        viewerId: ids.member,
        now: new Date("2026-09-03T00:00:00Z"),
      }),
    ).resolves.toMatchObject({
      job: { id: ids.job, title: "Product Designer" },
      saved: false,
      dismissed: false,
      applicationStatus: null,
    });
    await expect(
      getGroupJobDetail(execute, {
        groupId: ids.group,
        jobId: ids.job,
        viewerId: ids.outsider,
      }),
    ).resolves.toBeNull();
    await expect(
      getGroupJobDetail(execute, {
        groupId: ids.otherGroup,
        jobId: ids.job,
        viewerId: ids.outsider,
      }),
    ).resolves.toBeNull();
  });
});
