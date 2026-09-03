// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  listApplicationTracker,
  updateApplicationDetails,
  updateApplicationStatus,
  type ApplicationSqlExecutor,
} from "@/server/applications/service";

const ids = {
  owner: "81000000-0000-4000-8000-000000000101",
  member: "81000000-0000-4000-8000-000000000102",
  outsider: "81000000-0000-4000-8000-000000000103",
  group: "81000000-0000-4000-8000-000000000201",
  otherGroup: "81000000-0000-4000-8000-000000000202",
  job: "81000000-0000-4000-8000-000000000301",
  otherJob: "81000000-0000-4000-8000-000000000302",
  ownerApplication: "81000000-0000-4000-8000-000000000401",
  memberApplication: "81000000-0000-4000-8000-000000000402",
  otherApplication: "81000000-0000-4000-8000-000000000403",
};

function readMigrations() {
  const directory = path.resolve(process.cwd(), "drizzle");
  return readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(path.join(directory, file), "utf8"));
}

describe("application tracker", () => {
  let client: PGlite;
  let execute: ApplicationSqlExecutor;

  beforeAll(async () => {
    client = await PGlite.create({ extensions: { vector } });
    for (const migration of readMigrations()) await client.exec(migration);

    await client.query(
      `insert into users (id, name, email, email_verified)
       values ($1, 'Owner', 'tracker-owner@example.test', true),
              ($2, 'Member', 'tracker-member@example.test', true),
              ($3, 'Outsider', 'tracker-outsider@example.test', true)`,
      [ids.owner, ids.member, ids.outsider],
    );
    await client.query(
      `insert into groups (id, name, slug, engine_key, owner_id)
       values ($1, 'Main Jobs', 'main-jobs-tracker', 'jobs', $3),
              ($2, 'Other Jobs', 'other-jobs-tracker', 'jobs', $3)`,
      [ids.group, ids.otherGroup, ids.owner],
    );
    await client.query(
      `insert into group_memberships (group_id, user_id, role, status)
       values ($1, $2, 'owner', 'active'),
              ($1, $3, 'member', 'active'),
              ($4, $2, 'owner', 'active')`,
      [ids.group, ids.owner, ids.member, ids.otherGroup],
    );
    await client.query(
      `insert into jobs (
         id, canonical_url, company, title, location, source
       ) values
       ($1, 'https://tracker.example.test/main', 'Main Co', 'Product Designer', 'Bengaluru', 'test'),
       ($2, 'https://tracker.example.test/other', 'Other Co', 'Researcher', 'Remote', 'test')`,
      [ids.job, ids.otherJob],
    );
    await client.query(
      `insert into job_shares (group_id, job_id, sharer_id)
       values ($1, $2, $3), ($4, $5, $3)`,
      [ids.group, ids.job, ids.owner, ids.otherGroup, ids.otherJob],
    );
    await client.query(
      `insert into applications (
         id, user_id, job_id, source_group_id, status, visibility, private_notes
       ) values
       ($1, $2, $3, $4, 'saved', 'private', 'Owner private preparation'),
       ($5, $6, $3, $4, 'applied', 'private', 'Member private preparation'),
       ($7, $2, $8, $9, 'offer', 'private', 'Other group private preparation')`,
      [
        ids.ownerApplication,
        ids.owner,
        ids.job,
        ids.group,
        ids.memberApplication,
        ids.member,
        ids.otherApplication,
        ids.otherJob,
        ids.otherGroup,
      ],
    );
    await client.query(
      `insert into application_status_events (
         application_id, from_status, to_status, changed_by_user_id, created_at
       ) values
       ($1, null, 'saved', $2, '2026-09-01T09:00:00Z'),
       ($3, null, 'applied', $4, '2026-09-01T10:00:00Z'),
       ($5, null, 'offer', $2, '2026-09-01T11:00:00Z')`,
      [
        ids.ownerApplication,
        ids.owner,
        ids.memberApplication,
        ids.member,
        ids.otherApplication,
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

  afterAll(async () => {
    await client.close();
  });

  it("returns only the viewer's applications in the requested group", async () => {
    const ownerTracker = await listApplicationTracker(execute, {
      groupId: ids.group,
      userId: ids.owner,
      filter: "all",
    });
    const memberTracker = await listApplicationTracker(execute, {
      groupId: ids.group,
      userId: ids.member,
      filter: "all",
    });

    expect(ownerTracker?.map((application) => application.id)).toEqual([
      ids.ownerApplication,
    ]);
    expect(ownerTracker?.[0]?.privateNotes).toBe("Owner private preparation");
    expect(JSON.stringify(ownerTracker)).not.toContain(
      "Other group private preparation",
    );
    expect(memberTracker?.map((application) => application.id)).toEqual([
      ids.memberApplication,
    ]);
    expect(JSON.stringify(memberTracker)).not.toContain(
      "Owner private preparation",
    );
  });

  it("filters by status and rejects non-members", async () => {
    await expect(
      listApplicationTracker(execute, {
        groupId: ids.group,
        userId: ids.owner,
        filter: "applied",
      }),
    ).resolves.toEqual([]);
    await expect(
      listApplicationTracker(execute, {
        groupId: ids.group,
        userId: ids.outsider,
        filter: "all",
      }),
    ).resolves.toBeNull();
  });

  it("records each status transition once and keeps the full timeline", async () => {
    await expect(
      updateApplicationStatus(execute, {
        applicationId: ids.ownerApplication,
        groupId: ids.group,
        userId: ids.owner,
        status: "applied",
      }),
    ).resolves.toMatchObject({ changed: true });
    await expect(
      updateApplicationStatus(execute, {
        applicationId: ids.ownerApplication,
        groupId: ids.group,
        userId: ids.owner,
        status: "interviewing",
      }),
    ).resolves.toMatchObject({ changed: true });
    await expect(
      updateApplicationStatus(execute, {
        applicationId: ids.ownerApplication,
        groupId: ids.group,
        userId: ids.owner,
        status: "interviewing",
      }),
    ).resolves.toMatchObject({ changed: false });

    const tracker = await listApplicationTracker(execute, {
      groupId: ids.group,
      userId: ids.owner,
      filter: "interviewing",
    });
    expect(tracker?.[0]).toMatchObject({
      status: "interviewing",
      appliedAt: expect.any(Date),
    });
    expect(tracker?.[0]?.timeline.map((event) => event.toStatus)).toEqual([
      "interviewing",
      "applied",
      "saved",
    ]);
  });

  it("updates private notes and optional next actions only for the owner", async () => {
    await expect(
      updateApplicationDetails(execute, {
        applicationId: ids.ownerApplication,
        groupId: ids.group,
        userId: ids.owner,
        privateNotes: "Prepare a concise portfolio walkthrough.",
        nextAction: "Email the recruiter",
        nextActionDate: "2026-09-08",
      }),
    ).resolves.toEqual({ applicationId: ids.ownerApplication });

    const tracker = await listApplicationTracker(execute, {
      groupId: ids.group,
      userId: ids.owner,
      filter: "all",
    });
    expect(tracker?.[0]).toMatchObject({
      privateNotes: "Prepare a concise portfolio walkthrough.",
      nextAction: "Email the recruiter",
      nextActionDate: "2026-09-08",
    });

    await expect(
      updateApplicationDetails(execute, {
        applicationId: ids.ownerApplication,
        groupId: ids.group,
        userId: ids.member,
        privateNotes: "Attempted overwrite",
        nextAction: "",
        nextActionDate: "",
      }),
    ).resolves.toBeNull();
    await expect(
      updateApplicationStatus(execute, {
        applicationId: ids.ownerApplication,
        groupId: ids.otherGroup,
        userId: ids.owner,
        status: "offer",
      }),
    ).resolves.toBeNull();
  });
});
