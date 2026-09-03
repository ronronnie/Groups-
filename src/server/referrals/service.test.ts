// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createReferralRequest,
  listPotentialReferrers,
  listReferralRequests,
  transitionReferralRequest,
  type ReferralSqlExecutor,
} from "@/server/referrals/service";

const ids = {
  requester: "82000000-0000-4000-8000-000000000101",
  referrer: "82000000-0000-4000-8000-000000000102",
  privateSharer: "82000000-0000-4000-8000-000000000103",
  privateNonSharer: "82000000-0000-4000-8000-000000000104",
  irrelevant: "82000000-0000-4000-8000-000000000105",
  admin: "82000000-0000-4000-8000-000000000106",
  outsider: "82000000-0000-4000-8000-000000000107",
  group: "82000000-0000-4000-8000-000000000201",
  job: "82000000-0000-4000-8000-000000000301",
};

function readMigrations() {
  const directory = path.resolve(process.cwd(), "drizzle");
  return readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(path.join(directory, file), "utf8"));
}

describe("referral requests", () => {
  let client: PGlite;
  let execute: ReferralSqlExecutor;

  beforeAll(async () => {
    client = await PGlite.create({ extensions: { vector } });
    for (const migration of readMigrations()) await client.exec(migration);

    await client.query(
      `insert into users (id, name, email, email_verified)
       values ($1, 'Requester', 'referral-requester@example.test', true),
              ($2, 'Visible Referrer', 'visible-referrer@example.test', true),
              ($3, 'Private Sharer', 'private-sharer@example.test', true),
              ($4, 'Private Non Sharer', 'private-non-sharer@example.test', true),
              ($5, 'Unrelated Member', 'unrelated@example.test', true),
              ($6, 'Group Admin', 'admin@example.test', true),
              ($7, 'Outsider', 'referral-outsider@example.test', true)`,
      [
        ids.requester,
        ids.referrer,
        ids.privateSharer,
        ids.privateNonSharer,
        ids.irrelevant,
        ids.admin,
        ids.outsider,
      ],
    );
    await client.query(
      `insert into profiles (
         user_id, display_name, "current_role", current_company, visibility, privacy_settings
       ) values
       ($1, 'Requester', 'Product Designer', 'Portfolio Co', 'groups', '{"showCurrentCompany":false,"showLocation":false,"showSkills":false,"showYearsExperience":false}'),
       ($2, 'Visible Referrer', 'Senior Product Designer', 'Acme', 'groups', '{"showCurrentCompany":true,"showLocation":false,"showSkills":false,"showYearsExperience":false}'),
       ($3, 'Private Sharer', 'Secret Role', 'Acme', 'private', '{"showCurrentCompany":true,"showLocation":false,"showSkills":false,"showYearsExperience":false}'),
       ($4, 'Private Non Sharer', 'Secret Role', 'Acme', 'private', '{"showCurrentCompany":true,"showLocation":false,"showSkills":false,"showYearsExperience":false}'),
       ($5, 'Unrelated Member', 'Accountant', 'Other Co', 'groups', '{"showCurrentCompany":true,"showLocation":false,"showSkills":false,"showYearsExperience":false}')`,
      [
        ids.requester,
        ids.referrer,
        ids.privateSharer,
        ids.privateNonSharer,
        ids.irrelevant,
      ],
    );
    await client.query(
      `insert into groups (id, name, slug, engine_key, owner_id)
       values ($1, 'Referral Group', 'referral-group', 'jobs', $2)`,
      [ids.group, ids.requester],
    );
    await client.query(
      `insert into group_memberships (group_id, user_id, role, status)
       values ($1, $2, 'owner', 'active'),
              ($1, $3, 'member', 'active'),
              ($1, $4, 'member', 'active'),
              ($1, $5, 'member', 'active'),
              ($1, $6, 'member', 'active'),
              ($1, $7, 'admin', 'active')`,
      [
        ids.group,
        ids.requester,
        ids.referrer,
        ids.privateSharer,
        ids.privateNonSharer,
        ids.irrelevant,
        ids.admin,
      ],
    );
    await client.query(
      `insert into jobs (id, canonical_url, company, title, source)
       values ($1, 'https://referrals.example.test/job', 'Acme', 'Senior Product Designer', 'test')`,
      [ids.job],
    );
    await client.query(
      `insert into job_shares (group_id, job_id, sharer_id)
       values ($1, $2, $3)`,
      [ids.group, ids.job, ids.privateSharer],
    );
    await client.query(
      `insert into applications (
         user_id, job_id, source_group_id, status, visibility, private_notes
       ) values ($1, $2, $3, 'applied', 'private', 'NEVER EXPOSE THIS NOTE')`,
      [ids.requester, ids.job, ids.group],
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
      "delete from referral_request_state_events; delete from referral_requests;",
    );
  });

  afterAll(async () => {
    await client.close();
  });

  it("matches a small set using only visible profile data and group context", async () => {
    const candidates = await listPotentialReferrers(execute, {
      groupId: ids.group,
      jobId: ids.job,
      viewerId: ids.requester,
    });

    expect(candidates?.map((candidate) => candidate.userId)).toEqual([
      ids.referrer,
      ids.privateSharer,
    ]);
    expect(candidates?.[0]?.context).toContain("Works at Acme");
    expect(candidates?.[1]).toMatchObject({
      currentCompany: null,
      currentRole: null,
      context: ["Shared this job with the group"],
    });
    expect(JSON.stringify(candidates)).not.toContain(ids.privateNonSharer);
  });

  it("creates one active request and prevents duplicates", async () => {
    const input = {
      groupId: ids.group,
      jobId: ids.job,
      requesterId: ids.requester,
      potentialReferrerId: ids.referrer,
      message: "Would you be comfortable considering a referral for me?",
    };

    await expect(createReferralRequest(execute, input)).resolves.toEqual({
      requestId: expect.any(String),
    });
    await expect(createReferralRequest(execute, input)).resolves.toBeNull();

    const requests = await listReferralRequests(execute, {
      groupId: ids.group,
      viewerId: ids.requester,
    });
    expect(requests?.[0]).toMatchObject({
      state: "requested",
      referrerContext: expect.arrayContaining(["Works at Acme"]),
    });
    expect(requests?.[0]?.timeline.map((event) => event.toState)).toEqual([
      "requested",
    ]);
  });

  it("enforces party transitions and records status history", async () => {
    const created = await createReferralRequest(execute, {
      groupId: ids.group,
      jobId: ids.job,
      requesterId: ids.requester,
      potentialReferrerId: ids.referrer,
      message: "Would you be comfortable considering a referral for me?",
    });
    expect(created).not.toBeNull();

    await expect(
      transitionReferralRequest(execute, {
        groupId: ids.group,
        requestId: created!.requestId,
        userId: ids.requester,
        nextState: "accepted",
        note: "",
      }),
    ).resolves.toBeNull();
    await expect(
      transitionReferralRequest(execute, {
        groupId: ids.group,
        requestId: created!.requestId,
        userId: ids.referrer,
        nextState: "accepted",
        note: "Happy to review the profile first.",
      }),
    ).resolves.toEqual({ requestId: created!.requestId });
    await expect(
      transitionReferralRequest(execute, {
        groupId: ids.group,
        requestId: created!.requestId,
        userId: ids.requester,
        nextState: "referred",
        note: "",
      }),
    ).resolves.toBeNull();
    await expect(
      transitionReferralRequest(execute, {
        groupId: ids.group,
        requestId: created!.requestId,
        userId: ids.referrer,
        nextState: "referred",
        note: "Referral submitted.",
      }),
    ).resolves.toEqual({ requestId: created!.requestId });

    const requests = await listReferralRequests(execute, {
      groupId: ids.group,
      viewerId: ids.referrer,
    });
    expect(requests?.[0]?.timeline.map((event) => event.toState)).toEqual([
      "referred",
      "accepted",
      "requested",
    ]);
  });

  it("keeps details limited to involved parties and allowed admins", async () => {
    await createReferralRequest(execute, {
      groupId: ids.group,
      jobId: ids.job,
      requesterId: ids.requester,
      potentialReferrerId: ids.referrer,
      message: "Would you be comfortable considering a referral for me?",
    });

    await expect(
      listReferralRequests(execute, {
        groupId: ids.group,
        viewerId: ids.outsider,
      }),
    ).resolves.toBeNull();
    await expect(
      listReferralRequests(execute, {
        groupId: ids.group,
        viewerId: ids.irrelevant,
      }),
    ).resolves.toEqual([]);
    const adminView = await listReferralRequests(execute, {
      groupId: ids.group,
      viewerId: ids.admin,
    });
    expect(adminView).toHaveLength(1);
    expect(JSON.stringify(adminView)).not.toContain("NEVER EXPOSE THIS NOTE");
    await expect(
      transitionReferralRequest(execute, {
        groupId: ids.group,
        requestId: adminView![0]!.id,
        userId: ids.admin,
        nextState: "accepted",
        note: "Admin should not act for a participant.",
      }),
    ).resolves.toBeNull();
  });
});
