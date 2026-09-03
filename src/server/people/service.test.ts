// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  getGroupMemberOverview,
  listGroupPeople,
  type PeopleSqlExecutor,
} from "@/server/people/service";

const ids = {
  viewer: "92000000-0000-4000-8000-000000000101",
  visible: "92000000-0000-4000-8000-000000000102",
  private: "92000000-0000-4000-8000-000000000103",
  outsider: "92000000-0000-4000-8000-000000000104",
  group: "92000000-0000-4000-8000-000000000201",
};

function readMigrations() {
  const directory = path.resolve(process.cwd(), "drizzle");
  return readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(path.join(directory, file), "utf8"));
}

describe("People directory", () => {
  let client: PGlite;
  let execute: PeopleSqlExecutor;

  beforeAll(async () => {
    client = await PGlite.create({ extensions: { vector } });
    for (const migration of readMigrations()) await client.exec(migration);

    await client.query(
      `insert into users (id, name, email, email_verified)
       values ($1, 'Directory Viewer', 'people-viewer@example.test', true),
              ($2, 'Visible Helper', 'people-visible@example.test', true),
              ($3, 'Private Member', 'people-private@example.test', true),
              ($4, 'Directory Outsider', 'people-outsider@example.test', true)`,
      [ids.viewer, ids.visible, ids.private, ids.outsider],
    );
    await client.query(
      `insert into groups (id, name, slug, engine_key, owner_id)
       values ($1, 'People Group', 'people-group', 'jobs', $2)`,
      [ids.group, ids.viewer],
    );
    await client.query(
      `insert into group_memberships (group_id, user_id, role, status)
       values ($1, $2, 'owner', 'active'),
              ($1, $3, 'member', 'active'),
              ($1, $4, 'member', 'active')`,
      [ids.group, ids.viewer, ids.visible, ids.private],
    );
    await client.query(
      `insert into profiles (
         user_id, display_name, headline, "current_role", current_company,
         location, skills, visibility, privacy_settings
       ) values
       ($1, 'Visible Helper', 'Design systems specialist', 'Design Lead',
        'Public Studio', 'Bengaluru', '["Figma", "Research"]', 'groups',
        '{"showCurrentCompany":true,"showLocation":false,"showSkills":true,"showYearsExperience":false}'),
       ($2, 'Secret Alias', 'Private headline', 'Secret Architect',
        'Hidden Company', 'Hidden City', '["Hidden Skill"]', 'private',
        '{"showCurrentCompany":true,"showLocation":true,"showSkills":true,"showYearsExperience":true}')`,
      [ids.visible, ids.private],
    );
    await client.query(
      `insert into user_reputation_summaries (
         group_id, user_id, total_points, jobs_shared, jobs_saved_by_members,
         applications_attributed, referrals_completed, interviews_helped, hires_helped
       ) values
       ($1, $2, 9, 2, 1, 0, 1, 0, 0),
       ($1, $3, 0, 0, 0, 0, 0, 0, 0)`,
      [ids.group, ids.visible, ids.private],
    );
    await client.query(
      `insert into reputation_events (
         group_id, recipient_user_id, actor_user_id, event_type,
         source_entity_type, source_entity_id, points
       ) values
       ($1, $2, $3, 'referral_completed', 'referral_request',
        '92000000-0000-4000-8000-000000000501', 5)`,
      [ids.group, ids.visible, ids.viewer],
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

  it("returns visible fields and contribution signals for active members", async () => {
    const members = await listGroupPeople(execute, {
      groupId: ids.group,
      viewerId: ids.viewer,
    });

    expect(members).toHaveLength(3);
    expect(members?.[0]).toMatchObject({
      userId: ids.visible,
      currentRole: "Design Lead",
      currentCompany: "Public Studio",
      location: null,
      skills: ["Figma", "Research"],
      badges: ["job_saved_by_member", "referral_completed"],
    });
    expect(
      members?.find((member) => member.userId === ids.private),
    ).toMatchObject({
      displayName: "Private Member",
      profileVisible: false,
      headline: null,
      currentRole: null,
      currentCompany: null,
      location: null,
      skills: [],
    });
    expect(JSON.stringify(members)).not.toContain("Hidden Company");
    expect(JSON.stringify(members)).not.toContain("Secret Alias");
  });

  it("searches and filters only privacy-sanitized directory fields", async () => {
    await expect(
      listGroupPeople(execute, {
        groupId: ids.group,
        viewerId: ids.viewer,
        query: "Hidden Company",
      }),
    ).resolves.toEqual([]);
    await expect(
      listGroupPeople(execute, {
        groupId: ids.group,
        viewerId: ids.viewer,
        query: "Figma",
      }),
    ).resolves.toEqual([expect.objectContaining({ userId: ids.visible })]);
    await expect(
      listGroupPeople(execute, {
        groupId: ids.group,
        viewerId: ids.viewer,
        filter: "referral_helpers",
      }),
    ).resolves.toEqual([expect.objectContaining({ userId: ids.visible })]);
  });

  it("denies outsiders and keeps private member profiles private", async () => {
    await expect(
      listGroupPeople(execute, {
        groupId: ids.group,
        viewerId: ids.outsider,
      }),
    ).resolves.toBeNull();

    const overview = await getGroupMemberOverview(execute, {
      groupId: ids.group,
      viewerId: ids.viewer,
      memberId: ids.private,
    });
    expect(overview?.member).toMatchObject({
      profileVisible: false,
      currentCompany: null,
      skills: [],
    });
    await expect(
      getGroupMemberOverview(execute, {
        groupId: ids.group,
        viewerId: ids.outsider,
        memberId: ids.visible,
      }),
    ).resolves.toBeNull();
  });
});
