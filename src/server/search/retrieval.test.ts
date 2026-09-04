// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import type { SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  listAuthorizedKnowledgeSources,
  type SearchSqlExecutor,
} from "@/server/search/retrieval";

const ids = {
  viewer: "10000000-0000-4000-8000-000000000001",
  helper: "10000000-0000-4000-8000-000000000002",
  outsider: "10000000-0000-4000-8000-000000000003",
  groupA: "20000000-0000-4000-8000-000000000001",
  groupB: "20000000-0000-4000-8000-000000000002",
  jobA: "30000000-0000-4000-8000-000000000001",
  jobB: "30000000-0000-4000-8000-000000000002",
  shareA: "40000000-0000-4000-8000-000000000001",
  shareB: "40000000-0000-4000-8000-000000000002",
  threadA: "70000000-0000-4000-8000-000000000001",
  generalA: "70000000-0000-4000-8000-000000000002",
  messageA: "71000000-0000-4000-8000-000000000001",
  generalMessageA: "71000000-0000-4000-8000-000000000002",
  outcomeA: "90000000-0000-4000-8000-000000000001",
  privateOutcomeA: "90000000-0000-4000-8000-000000000002",
};

function readMigrations() {
  const directory = path.resolve(process.cwd(), "drizzle");
  return readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(path.join(directory, file), "utf8"));
}

describe("Ask this Group retrieval boundaries", () => {
  let client: PGlite;
  let execute: SearchSqlExecutor;

  beforeAll(async () => {
    client = await PGlite.create({ extensions: { vector } });
    for (const migration of readMigrations()) await client.exec(migration);
    const database = drizzle(client);
    execute = async <Row extends Record<string, unknown>>(query: SQL) => {
      const result = await database.execute(query);
      return { rows: result.rows as Row[] };
    };

    await client.exec(`
      insert into users (id, name, email, email_verified) values
        ('${ids.viewer}', 'Viewer', 'viewer@example.test', true),
        ('${ids.helper}', 'Visible Helper', 'helper@example.test', true),
        ('${ids.outsider}', 'Outside Person', 'outside@example.test', true);
      insert into groups (id, name, slug, engine_key, owner_id) values
        ('${ids.groupA}', 'Group A', 'group-a', 'jobs', '${ids.viewer}'),
        ('${ids.groupB}', 'Group B', 'group-b', 'jobs', '${ids.outsider}');
      insert into group_memberships (group_id, user_id, role, status) values
        ('${ids.groupA}', '${ids.viewer}', 'owner', 'active'),
        ('${ids.groupA}', '${ids.helper}', 'member', 'active'),
        ('${ids.groupB}', '${ids.outsider}', 'owner', 'active');
      insert into jobs (id, canonical_url, company, title, description_summary, location, work_mode, source) values
        ('${ids.jobA}', 'https://a.example.test/job', 'Group A Co', 'Product Designer', 'Design systems role', 'Remote', 'remote', 'test'),
        ('${ids.jobB}', 'https://b.example.test/job', 'PRIVATE GROUP B CO', 'Backend Engineer', 'Outside group role', 'London', 'onsite', 'test');
      insert into job_shares (id, group_id, job_id, sharer_id, note) values
        ('${ids.shareA}', '${ids.groupA}', '${ids.jobA}', '${ids.helper}', 'Portfolio review available'),
        ('${ids.shareB}', '${ids.groupB}', '${ids.jobB}', '${ids.outsider}', 'OUTSIDE GROUP NOTE');
      insert into profiles (user_id, display_name, headline, "current_role", current_company, years_experience, location, skills, visibility, privacy_settings) values
        ('${ids.helper}', 'Visible Helper', 'Design mentor', 'Designer', 'HIDDEN COMPANY', 7, 'HIDDEN LOCATION', '["Figma", "Research"]', 'groups', '{"showCurrentCompany":false,"showLocation":false,"showSkills":true,"showYearsExperience":false}'),
        ('${ids.outsider}', 'OUTSIDE PROFILE', 'Other group only', 'Engineer', 'Other Co', 5, 'London', '["Rust"]', 'public', '{"showCurrentCompany":true,"showLocation":true,"showSkills":true,"showYearsExperience":true}');
      insert into profile_preferences (user_id, desired_roles, private_notes) values
        ('${ids.helper}', '["PRIVATE DESIRED ROLE"]', 'PRIVATE PROFILE NOTE');
      insert into message_threads (id, group_id, job_id, kind, title) values
        ('${ids.threadA}', '${ids.groupA}', '${ids.jobA}', 'job', 'Job discussion'),
        ('${ids.generalA}', '${ids.groupA}', null, 'general', 'General chat');
      insert into messages (id, group_id, thread_id, author_id, body) values
        ('${ids.messageA}', '${ids.groupA}', '${ids.threadA}', '${ids.helper}', 'The hiring manager values research.'),
        ('${ids.generalMessageA}', '${ids.groupA}', '${ids.generalA}', '${ids.helper}', 'GENERAL CHAT SHOULD NOT BE INDEXED');
      insert into outcomes (id, group_id, job_id, subject_user_id, outcome_type, visibility, consent_granted_at, shared_at) values
        ('${ids.outcomeA}', '${ids.groupA}', '${ids.jobA}', '${ids.helper}', 'interview', 'group', now(), now()),
        ('${ids.privateOutcomeA}', '${ids.groupA}', '${ids.jobA}', '${ids.viewer}', 'offer', 'private', null, null);
      insert into user_reputation_summaries (group_id, user_id, jobs_shared, referrals_completed) values
        ('${ids.groupA}', '${ids.helper}', 3, 2);
    `);
  }, 30_000);

  afterAll(async () => {
    await client.close();
  });

  it("indexes only active-group, public-purpose content with profile field controls", async () => {
    const sources = await listAuthorizedKnowledgeSources(execute, {
      groupId: ids.groupA,
      groupSlug: "group-a",
      viewerId: ids.viewer,
    });
    const serialized = JSON.stringify(sources);

    expect(sources.map((source) => source.kind)).toEqual(
      expect.arrayContaining([
        "job",
        "job_share",
        "discussion",
        "profile",
        "outcome",
        "reputation",
      ]),
    );
    expect(serialized).toContain("Group A Co");
    expect(serialized).toContain("Figma");
    expect(serialized).not.toContain("PRIVATE GROUP B CO");
    expect(serialized).not.toContain("OUTSIDE GROUP NOTE");
    expect(serialized).not.toContain("OUTSIDE PROFILE");
    expect(serialized).not.toContain("HIDDEN COMPANY");
    expect(serialized).not.toContain("HIDDEN LOCATION");
    expect(serialized).not.toContain("PRIVATE DESIRED ROLE");
    expect(serialized).not.toContain("PRIVATE PROFILE NOTE");
    expect(serialized).not.toContain("GENERAL CHAT SHOULD NOT BE INDEXED");
    expect(serialized).not.toContain("offer");
  });

  it("returns no knowledge to a user outside the group", async () => {
    const sources = await listAuthorizedKnowledgeSources(execute, {
      groupId: ids.groupA,
      groupSlug: "group-a",
      viewerId: ids.outsider,
    });

    expect(sources).toEqual([]);
  });
});
