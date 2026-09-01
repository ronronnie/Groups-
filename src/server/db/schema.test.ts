// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedData } from "@/server/db/seed-data";

const ids = {
  userA: "10000000-0000-4000-8000-000000000001",
  userB: "10000000-0000-4000-8000-000000000002",
  groupA: "20000000-0000-4000-8000-000000000001",
  groupB: "20000000-0000-4000-8000-000000000002",
  job: "30000000-0000-4000-8000-000000000001",
  application: "50000000-0000-4000-8000-000000000001",
  threadA: "70000000-0000-4000-8000-000000000001",
  threadB: "70000000-0000-4000-8000-000000000002",
};

function readMigrations() {
  const directory = path.resolve(process.cwd(), "drizzle");
  return readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(path.join(directory, file), "utf8"));
}

describe("database schema constraints", () => {
  let database: PGlite;

  beforeAll(async () => {
    database = await PGlite.create({ extensions: { vector } });

    for (const migration of readMigrations()) {
      await database.exec(migration);
    }

    await database.query(
      `insert into users (id, name, email, email_verified)
       values ($1, 'Demo A', 'constraint-a@example.test', true),
              ($2, 'Demo B', 'constraint-b@example.test', true)`,
      [ids.userA, ids.userB],
    );
    await database.query(
      `insert into groups (id, name, slug, engine_key, owner_id)
       values ($1, 'Group A', 'constraint-group-a', 'jobs', $3),
              ($2, 'Group B', 'constraint-group-b', 'jobs', $3)`,
      [ids.groupA, ids.groupB, ids.userA],
    );
    await database.query(
      `insert into jobs (id, canonical_url, company, title, source)
       values ($1, 'https://constraints.example.test/job-1', 'Fictional Co', 'Designer', 'test')`,
      [ids.job],
    );
    await database.query(
      `insert into message_threads (id, group_id, kind, title)
       values ($1, $3, 'general', 'General A'),
              ($2, $4, 'general', 'General B')`,
      [ids.threadA, ids.threadB, ids.groupA, ids.groupB],
    );
  }, 30_000);

  afterAll(async () => {
    await database.close();
  });

  it("loads pgvector before the vector schema", async () => {
    const result = await database.query<{ dimensions: number }>(
      `select atttypmod as dimensions
       from pg_attribute
       where attrelid = 'job_embeddings'::regclass and attname = 'embedding'`,
    );

    expect(result.rows[0]?.dimensions).toBe(1536);
  });

  it("allows only the supported jobs engine", async () => {
    await expect(
      database.query(
        `insert into groups (name, slug, engine_key, owner_id)
         values ('Invalid', 'invalid-engine', 'travel', $1)`,
        [ids.userA],
      ),
    ).rejects.toThrow(/groups_engine_key_check/i);
  });

  it("keeps canonical jobs separate from each member share", async () => {
    await database.query(
      `insert into job_shares (group_id, job_id, sharer_id)
       values ($1, $2, $3), ($1, $2, $4)`,
      [ids.groupA, ids.job, ids.userA, ids.userB],
    );

    const shares = await database.query<{ count: number }>(
      "select count(*)::int as count from job_shares where job_id = $1",
      [ids.job],
    );
    expect(shares.rows[0]?.count).toBe(2);

    await expect(
      database.query(
        `insert into job_shares (group_id, job_id, sharer_id)
         values ($1, $2, $3)`,
        [ids.groupA, ids.job, ids.userA],
      ),
    ).rejects.toThrow(/job_shares_group_job_sharer_unique/i);

    await expect(
      database.query(
        `insert into jobs (canonical_url, company, title, source)
         values ('https://constraints.example.test/job-1', 'Other Co', 'Duplicate', 'test')`,
      ),
    ).rejects.toThrow(/jobs_canonical_url_unique/i);
  });

  it("defaults applications to private and preserves status history", async () => {
    await database.query(
      `insert into applications (id, user_id, job_id, source_group_id)
       values ($1, $2, $3, $4)`,
      [ids.application, ids.userA, ids.job, ids.groupA],
    );
    await database.query(
      `insert into application_status_events
       (application_id, from_status, to_status, changed_by_user_id)
       values ($1, null, 'not_applied', $2),
              ($1, 'not_applied', 'applied', $2)`,
      [ids.application, ids.userA],
    );

    const application = await database.query<{
      status: string;
      visibility: string;
    }>("select status, visibility from applications where id = $1", [
      ids.application,
    ]);
    const history = await database.query<{ count: number }>(
      "select count(*)::int as count from application_status_events where application_id = $1",
      [ids.application],
    );

    expect(application.rows[0]).toEqual({
      status: "not_applied",
      visibility: "private",
    });
    expect(history.rows[0]?.count).toBe(2);
  });

  it("rejects referral requests to oneself", async () => {
    await expect(
      database.query(
        `insert into referral_requests
         (requester_id, potential_referrer_id, job_id, group_id, message)
         values ($1, $1, $2, $3, 'Self referral')`,
        [ids.userA, ids.job, ids.groupA],
      ),
    ).rejects.toThrow(/referral_requests_distinct_users_check/i);
  });

  it("prevents a message from referencing a thread in another group", async () => {
    await expect(
      database.query(
        `insert into messages (group_id, thread_id, author_id, body)
         values ($1, $2, $3, 'Cross-group message')`,
        [ids.groupB, ids.threadA, ids.userA],
      ),
    ).rejects.toThrow(/messages_thread_group_fk/i);
  });

  it("requires explicit consent before sharing an outcome", async () => {
    await expect(
      database.query(
        `insert into outcomes
         (group_id, job_id, subject_user_id, outcome_type, visibility, shared_at)
         values ($1, $2, $3, 'hired', 'group', now())`,
        [ids.groupA, ids.job, ids.userA],
      ),
    ).rejects.toThrow(/outcomes_consent_check/i);
  });
});

describe("development seed data", () => {
  it("contains the required fictional dataset", () => {
    expect(seedData.users).toHaveLength(8);
    expect(seedData.groups).toHaveLength(1);
    expect(seedData.jobs).toHaveLength(15);
    expect(seedData.applications.length).toBeGreaterThan(0);
    expect(seedData.referrals.length).toBeGreaterThan(0);
    expect(seedData.messages.length).toBeGreaterThan(0);
    expect(seedData.reputationEvents.length).toBeGreaterThan(0);

    expect(
      seedData.users.every((user) => user.email.endsWith("@example.test")),
    ).toBe(true);
    expect(
      seedData.jobs.every((job) => job.canonicalUrl.includes("example.test")),
    ).toBe(true);
  });
});
