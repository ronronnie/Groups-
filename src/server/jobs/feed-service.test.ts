// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  getForYouFeed,
  markJobApplied,
  setJobDismissed,
  setJobSaved,
} from "@/server/jobs/feed-service";
import type { JobSqlExecutor } from "@/server/jobs/service";

const ids = {
  owner: "50000000-0000-4000-8000-000000000101",
  member: "50000000-0000-4000-8000-000000000102",
  outsider: "50000000-0000-4000-8000-000000000103",
  group: "50000000-0000-4000-8000-000000000201",
  otherGroup: "50000000-0000-4000-8000-000000000202",
  designJob: "50000000-0000-4000-8000-000000000301",
  backendJob: "50000000-0000-4000-8000-000000000302",
  otherJob: "50000000-0000-4000-8000-000000000303",
};

function readMigrations() {
  const directory = path.resolve(process.cwd(), "drizzle");
  return readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(path.join(directory, file), "utf8"));
}

describe("For You jobs feed", () => {
  let client: PGlite;
  let execute: JobSqlExecutor;

  beforeAll(async () => {
    client = await PGlite.create({ extensions: { vector } });
    for (const migration of readMigrations()) {
      await client.exec(migration);
    }

    await client.query(
      `insert into users (id, name, email, email_verified)
       values ($1, 'Design Candidate', 'feed-owner@example.test', true),
              ($2, 'Acme Referrer', 'feed-member@example.test', true),
              ($3, 'Other Candidate', 'feed-outsider@example.test', true)`,
      [ids.owner, ids.member, ids.outsider],
    );
    await client.query(
      `insert into groups (id, name, slug, engine_key, owner_id)
       values ($1, 'Design Jobs', 'design-jobs-feed', 'jobs', $3),
              ($2, 'Private Other Jobs', 'other-jobs-feed', 'jobs', $4)`,
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
      `insert into profiles (
         user_id, display_name, "current_role", current_company,
         years_experience, location, skills, profile_completeness,
         visibility, privacy_settings
       ) values
       ($1, 'Design Candidate', 'Product Designer', 'Private Studio', 5,
        'Bengaluru, India', '["Figma", "Design systems", "Research"]', 100,
        'private', '{"showCurrentCompany":false,"showLocation":false,"showSkills":false,"showYearsExperience":false}'),
       ($2, 'Acme Referrer', 'Engineer', 'Acme', 6,
        'Bengaluru, India', '["TypeScript"]', 80,
        'groups', '{"showCurrentCompany":true,"showLocation":true,"showSkills":true,"showYearsExperience":true}')`,
      [ids.owner, ids.member],
    );
    await client.query(
      `insert into profile_preferences (
         user_id, desired_roles, preferred_locations, remote_preference, private_notes
       ) values
       ($1, '["Product Designer"]', '["Bengaluru", "Remote"]', 'hybrid', 'Confidential compensation target'),
       ($2, '["Backend Engineer"]', '["Bengaluru"]', 'remote', 'Member-only preference')`,
      [ids.owner, ids.member],
    );
    await client.query(
      `insert into jobs (
         id, canonical_url, company, title, description_summary, location,
         work_mode, employment_type, experience_min, experience_max, skills,
         source, status, posted_at
       ) values
       ($1, 'https://jobs.example.test/acme-designer', 'Acme', 'Senior Product Designer',
        'Design useful workflows.', 'Bengaluru, India', 'hybrid', 'full_time', 4, 7,
        '["Figma", "Design systems", "Research"]', 'example.test', 'active', '2026-09-01T10:00:00Z'),
       ($2, 'https://jobs.example.test/backend', 'Beta', 'Backend Engineer',
        'Build distributed services.', 'Mumbai, India', 'onsite', 'full_time', 8, 12,
        '["Go", "Kubernetes"]', 'example.test', 'active', '2026-08-10T10:00:00Z'),
       ($3, 'https://jobs.example.test/secret', 'Secret Co', 'Private Role',
        'Other group only.', 'Remote', 'remote', 'contract', 1, 3,
        '["Research"]', 'example.test', 'active', '2026-09-02T10:00:00Z')`,
      [ids.designJob, ids.backendJob, ids.otherJob],
    );
    await client.query(
      `insert into job_shares (group_id, job_id, sharer_id, note, shared_at)
       values ($1, $2, $3, 'Strong design team.', '2026-09-01T10:00:00Z'),
              ($1, $4, $3, null, '2026-08-10T10:00:00Z'),
              ($5, $6, $7, 'Do not leak.', '2026-09-02T10:00:00Z')`,
      [
        ids.group,
        ids.designJob,
        ids.member,
        ids.backendJob,
        ids.otherGroup,
        ids.otherJob,
        ids.outsider,
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

  it("ranks deterministically without returning private profile fields or other-group jobs", async () => {
    const feed = await getForYouFeed(execute, {
      groupId: ids.group,
      viewerId: ids.owner,
      filter: "recommended",
      now: new Date("2026-09-02T12:00:00Z"),
    });

    expect(feed?.items.map((job) => job.id)).toEqual([
      ids.designJob,
      ids.backendJob,
    ]);
    expect(feed?.items[0]).toMatchObject({
      matchStrength: "strong",
      referralMemberCount: 1,
    });
    expect(feed?.items[0]?.matchScore).toBeGreaterThan(
      feed?.items[1]?.matchScore ?? 100,
    );
    expect(feed).not.toHaveProperty("profile");
    expect(feed?.items[0]).not.toHaveProperty("desiredRoles");
    expect(JSON.stringify(feed)).not.toContain(
      "Confidential compensation target",
    );
    expect(JSON.stringify(feed)).not.toContain("Other group only");
  });

  it("authorizes membership and applies referral-profile privacy on the server", async () => {
    await expect(
      getForYouFeed(execute, {
        groupId: ids.group,
        viewerId: ids.outsider,
        filter: "recommended",
      }),
    ).resolves.toBeNull();

    await client.query(
      `update profiles
       set privacy_settings = jsonb_set(privacy_settings, '{showCurrentCompany}', 'false')
       where user_id = $1`,
      [ids.member],
    );
    const privateReferrerFeed = await getForYouFeed(execute, {
      groupId: ids.group,
      viewerId: ids.owner,
      filter: "recommended",
    });
    expect(privateReferrerFeed?.items[0]?.referralMemberCount).toBe(0);

    await client.query(
      `update profiles
       set privacy_settings = jsonb_set(privacy_settings, '{showCurrentCompany}', 'true')
       where user_id = $1`,
      [ids.member],
    );
  });

  it("keeps saved and dismissed state private to each viewer", async () => {
    await expect(
      setJobSaved(execute, {
        groupId: ids.group,
        userId: ids.owner,
        jobId: ids.designJob,
        saved: true,
      }),
    ).resolves.toBe(true);

    const saved = await getForYouFeed(execute, {
      groupId: ids.group,
      viewerId: ids.owner,
      filter: "saved",
    });
    const memberSaved = await getForYouFeed(execute, {
      groupId: ids.group,
      viewerId: ids.member,
      filter: "saved",
    });
    expect(saved?.items.map((job) => job.id)).toEqual([ids.designJob]);
    expect(memberSaved?.items).toEqual([]);

    await setJobDismissed(execute, {
      groupId: ids.group,
      userId: ids.owner,
      jobId: ids.designJob,
      dismissed: true,
    });
    expect(
      (
        await getForYouFeed(execute, {
          groupId: ids.group,
          viewerId: ids.owner,
          filter: "dismissed",
        })
      )?.items.map((job) => job.id),
    ).toEqual([ids.designJob]);

    await setJobSaved(execute, {
      groupId: ids.group,
      userId: ids.owner,
      jobId: ids.designJob,
      saved: true,
    });
    expect(
      (
        await getForYouFeed(execute, {
          groupId: ids.group,
          viewerId: ids.owner,
          filter: "dismissed",
        })
      )?.items,
    ).toEqual([]);

    await expect(
      setJobSaved(execute, {
        groupId: ids.otherGroup,
        userId: ids.owner,
        jobId: ids.otherJob,
        saved: true,
      }),
    ).resolves.toBe(false);
  });

  it("records a private application once and never exposes it to another member", async () => {
    await expect(
      markJobApplied(execute, {
        groupId: ids.group,
        userId: ids.owner,
        jobId: ids.designJob,
      }),
    ).resolves.toBe(true);
    await expect(
      markJobApplied(execute, {
        groupId: ids.group,
        userId: ids.owner,
        jobId: ids.designJob,
      }),
    ).resolves.toBe(true);

    const ownerApplied = await getForYouFeed(execute, {
      groupId: ids.group,
      viewerId: ids.owner,
      filter: "applied",
    });
    const memberApplied = await getForYouFeed(execute, {
      groupId: ids.group,
      viewerId: ids.member,
      filter: "applied",
    });
    expect(ownerApplied?.items.map((job) => job.id)).toEqual([ids.designJob]);
    expect(memberApplied?.items).toEqual([]);

    const application = await client.query<{
      events: number;
      status: string;
      visibility: string;
    }>(
      `select
         a.status,
         a.visibility,
         count(event.id)::int as events
       from applications a
       left join application_status_events event on event.application_id = a.id
       where a.user_id = $1 and a.job_id = $2
       group by a.id`,
      [ids.owner, ids.designJob],
    );
    expect(application.rows[0]).toEqual({
      status: "applied",
      visibility: "private",
      events: 1,
    });
  });
});
