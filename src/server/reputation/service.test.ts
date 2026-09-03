// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  recalculateReputationSummary,
  recordReputationEvent,
  type ReputationSqlExecutor,
} from "@/server/reputation/service";

const ids = {
  sharer: "91000000-0000-4000-8000-000000000101",
  member: "91000000-0000-4000-8000-000000000102",
  outsider: "91000000-0000-4000-8000-000000000103",
  group: "91000000-0000-4000-8000-000000000201",
  jobs: [
    "91000000-0000-4000-8000-000000000301",
    "91000000-0000-4000-8000-000000000302",
    "91000000-0000-4000-8000-000000000303",
    "91000000-0000-4000-8000-000000000304",
  ],
  shares: [
    "91000000-0000-4000-8000-000000000401",
    "91000000-0000-4000-8000-000000000402",
    "91000000-0000-4000-8000-000000000403",
    "91000000-0000-4000-8000-000000000404",
  ],
  interviewOutcome: "91000000-0000-4000-8000-000000000501",
  hiredOutcome: "91000000-0000-4000-8000-000000000502",
};

function readMigrations() {
  const directory = path.resolve(process.cwd(), "drizzle");
  return readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(path.join(directory, file), "utf8"));
}

describe("contribution reputation", () => {
  let client: PGlite;
  let execute: ReputationSqlExecutor;

  beforeAll(async () => {
    client = await PGlite.create({ extensions: { vector } });
    for (const migration of readMigrations()) await client.exec(migration);

    await client.query(
      `insert into users (id, name, email, email_verified)
       values ($1, 'Helpful Sharer', 'reputation-sharer@example.test', true),
              ($2, 'Group Member', 'reputation-member@example.test', true),
              ($3, 'Outsider', 'reputation-outsider@example.test', true)`,
      [ids.sharer, ids.member, ids.outsider],
    );
    await client.query(
      `insert into groups (id, name, slug, engine_key, owner_id)
       values ($1, 'Reputation Group', 'reputation-group', 'jobs', $2)`,
      [ids.group, ids.sharer],
    );
    await client.query(
      `insert into group_memberships (group_id, user_id, role, status)
       values ($1, $2, 'owner', 'active'), ($1, $3, 'member', 'active')`,
      [ids.group, ids.sharer, ids.member],
    );

    for (let index = 0; index < ids.jobs.length; index += 1) {
      await client.query(
        `insert into jobs (id, canonical_url, company, title, source)
         values ($1, $2, 'Useful Co', $3, 'test')`,
        [
          ids.jobs[index],
          `https://reputation.example.test/job-${index + 1}`,
          `Role ${index + 1}`,
        ],
      );
      await client.query(
        `insert into job_shares (id, group_id, job_id, sharer_id)
         values ($1, $2, $3, $4)`,
        [ids.shares[index], ids.group, ids.jobs[index], ids.sharer],
      );
    }
    await client.query(
      `insert into outcomes (
         id, group_id, job_id, subject_user_id, shared_by_user_id,
         referred_by_user_id, outcome_type, visibility,
         consent_granted_at, shared_at
       ) values
       ($1, $2, $3, $4, $4, $5, 'interview', 'group', now(), now()),
       ($6, $2, $3, $4, $4, $5, 'hired', 'group', now(), now())`,
      [
        ids.interviewOutcome,
        ids.group,
        ids.jobs[0],
        ids.member,
        ids.sharer,
        ids.hiredOutcome,
      ],
    );

    const database = drizzle(client);
    execute = async <Row extends Record<string, unknown>>(
      query: Parameters<typeof database.execute>[0],
    ) => {
      const result = await database.execute(query);
      return { rows: result.rows as Row[] };
    };
  }, 30_000);

  beforeEach(async () => {
    await client.exec(
      "delete from reputation_events; delete from user_reputation_summaries;",
    );
  });

  afterAll(async () => {
    await client.close();
  });

  it("records verified actions once and recalculates the cached summary", async () => {
    const event = {
      groupId: ids.group,
      recipientUserId: ids.sharer,
      actorUserId: ids.member,
      eventType: "job_saved_by_member" as const,
      sourceEntityId: ids.shares[0]!,
    };

    await expect(recordReputationEvent(execute, event)).resolves.toEqual({
      id: expect.any(String),
      points: 2,
    });
    await expect(recordReputationEvent(execute, event)).resolves.toBeNull();

    await client.query(
      `update user_reputation_summaries
       set total_points = 99, jobs_saved_by_members = 99
       where group_id = $1 and user_id = $2`,
      [ids.group, ids.sharer],
    );
    await expect(
      recalculateReputationSummary(execute, {
        groupId: ids.group,
        userId: ids.sharer,
      }),
    ).resolves.toEqual({
      totalPoints: 2,
      jobsShared: 0,
      jobsSavedByMembers: 1,
      applicationsAttributed: 0,
      referralsCompleted: 0,
      interviewsHelped: 0,
      hiresHelped: 0,
    });
  });

  it("records shares but limits point-earning share volume per day", async () => {
    const events = [];
    for (const shareId of ids.shares) {
      events.push(
        await recordReputationEvent(execute, {
          groupId: ids.group,
          recipientUserId: ids.sharer,
          actorUserId: null,
          eventType: "job_shared",
          sourceEntityId: shareId,
        }),
      );
    }

    expect(events.map((event) => event?.points)).toEqual([1, 1, 1, 0]);
    await expect(
      recalculateReputationSummary(execute, {
        groupId: ids.group,
        userId: ids.sharer,
      }),
    ).resolves.toMatchObject({ totalPoints: 3, jobsShared: 4 });
  });

  it("rejects unverified, self-attributed, and non-member actions", async () => {
    await expect(
      recordReputationEvent(execute, {
        groupId: ids.group,
        recipientUserId: ids.sharer,
        actorUserId: ids.sharer,
        eventType: "job_saved_by_member",
        sourceEntityId: ids.shares[0]!,
      }),
    ).resolves.toBeNull();
    await expect(
      recordReputationEvent(execute, {
        groupId: ids.group,
        recipientUserId: ids.sharer,
        actorUserId: ids.outsider,
        eventType: "job_saved_by_member",
        sourceEntityId: ids.shares[0]!,
      }),
    ).resolves.toBeNull();
    await expect(
      recordReputationEvent(execute, {
        groupId: ids.group,
        recipientUserId: ids.sharer,
        actorUserId: ids.member,
        eventType: "job_saved_by_member",
        sourceEntityId: ids.jobs[0]!,
      }),
    ).resolves.toBeNull();
  });

  it("requires matching consented outcomes for interview and hire credit", async () => {
    await expect(
      recordReputationEvent(execute, {
        groupId: ids.group,
        recipientUserId: ids.sharer,
        actorUserId: ids.member,
        eventType: "interview_helped",
        sourceEntityId: ids.interviewOutcome,
      }),
    ).resolves.toMatchObject({ points: 4 });
    await expect(
      recordReputationEvent(execute, {
        groupId: ids.group,
        recipientUserId: ids.sharer,
        actorUserId: ids.member,
        eventType: "hire_helped",
        sourceEntityId: ids.hiredOutcome,
      }),
    ).resolves.toMatchObject({ points: 10 });
    await expect(
      recordReputationEvent(execute, {
        groupId: ids.group,
        recipientUserId: ids.sharer,
        actorUserId: ids.member,
        eventType: "hire_helped",
        sourceEntityId: ids.interviewOutcome,
      }),
    ).resolves.toBeNull();

    await expect(
      recalculateReputationSummary(execute, {
        groupId: ids.group,
        userId: ids.sharer,
      }),
    ).resolves.toMatchObject({
      totalPoints: 14,
      interviewsHelped: 1,
      hiresHelped: 1,
    });
  });
});
