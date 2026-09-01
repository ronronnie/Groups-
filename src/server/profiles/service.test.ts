// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CareerProfileInput } from "@/domains/profiles/career-profile";
import {
  getOwnerCareerProfile,
  getVisibleCareerProfile,
  saveCareerProfile,
  type ProfileSqlExecutor,
} from "@/server/profiles/service";

const ids = {
  owner: "20000000-0000-4000-8000-000000000101",
  member: "20000000-0000-4000-8000-000000000102",
  outsider: "20000000-0000-4000-8000-000000000103",
  group: "20000000-0000-4000-8000-000000000201",
};

const profile: CareerProfileInput = {
  displayName: "Riya Sharma",
  headline: "Product designer building useful tools",
  currentRole: "Senior Product Designer",
  currentCompany: "Private Company",
  yearsExperience: 8,
  location: "Bengaluru, India",
  skills: ["Product design", "Research"],
  desiredRoles: ["Design Lead"],
  preferredLocations: ["Bengaluru", "Remote"],
  remotePreference: "hybrid",
  resumeUrl: "https://example.test/private-resume",
  portfolioUrl: "https://example.test/work",
  linkedinUrl: null,
  websiteUrl: null,
  privateNotes: "Private salary and team preferences.",
  visibility: "groups",
  privacySettings: {
    showCurrentCompany: false,
    showLocation: true,
    showSkills: false,
    showYearsExperience: true,
  },
};

function readMigrations() {
  const directory = path.resolve(process.cwd(), "drizzle");
  return readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(path.join(directory, file), "utf8"));
}

describe("career profile service", () => {
  let client: PGlite;
  let execute: ProfileSqlExecutor;

  beforeAll(async () => {
    client = await PGlite.create({ extensions: { vector } });
    for (const migration of readMigrations()) {
      await client.exec(migration);
    }

    await client.query(
      `insert into users (id, name, email, email_verified)
       values ($1, 'Profile Owner', 'profile-owner@example.test', true),
              ($2, 'Group Member', 'profile-member@example.test', true),
              ($3, 'Outsider', 'profile-outsider@example.test', true)`,
      [ids.owner, ids.member, ids.outsider],
    );
    await client.query(
      `insert into groups (id, name, slug, engine_key, owner_id)
       values ($1, 'Design Jobs', 'design-jobs-test', 'jobs', $2)`,
      [ids.group, ids.owner],
    );
    await client.query(
      `insert into group_memberships (group_id, user_id, role, status)
       values ($1, $2, 'owner', 'active'),
              ($1, $3, 'member', 'active')`,
      [ids.group, ids.owner, ids.member],
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

  it("creates and updates public and private profile data atomically", async () => {
    await expect(
      saveCareerProfile(execute, ids.owner, profile),
    ).resolves.toEqual({ completeness: 100 });

    await expect(
      getOwnerCareerProfile(execute, ids.owner),
    ).resolves.toMatchObject({
      displayName: "Riya Sharma",
      desiredRoles: ["Design Lead"],
      resumeUrl: "https://example.test/private-resume",
      privateNotes: "Private salary and team preferences.",
      completeness: 100,
    });

    await saveCareerProfile(execute, ids.owner, {
      ...profile,
      headline: "Design leader for thoughtful product teams",
      desiredRoles: ["Head of Design"],
    });

    const updated = await getOwnerCareerProfile(execute, ids.owner);
    expect(updated?.headline).toBe(
      "Design leader for thoughtful product teams",
    );
    expect(updated?.desiredRoles).toEqual(["Head of Design"]);
  });

  it("enforces group visibility and field privacy on the server", async () => {
    const shared = await getVisibleCareerProfile(execute, {
      viewerUserId: ids.member,
      subjectUserId: ids.owner,
      groupId: ids.group,
    });

    expect(shared).toMatchObject({
      displayName: "Riya Sharma",
      currentCompany: null,
      location: "Bengaluru, India",
      skills: [],
      yearsExperience: 8,
    });
    expect(shared).not.toHaveProperty("desiredRoles");
    expect(shared).not.toHaveProperty("preferredLocations");
    expect(shared).not.toHaveProperty("resumeUrl");
    expect(shared).not.toHaveProperty("privateNotes");

    await expect(
      getVisibleCareerProfile(execute, {
        viewerUserId: ids.outsider,
        subjectUserId: ids.owner,
        groupId: ids.group,
      }),
    ).resolves.toBeNull();
  });

  it("always gives the owner their public fields and respects private mode", async () => {
    await saveCareerProfile(execute, ids.owner, {
      ...profile,
      visibility: "private",
    });

    await expect(
      getVisibleCareerProfile(execute, {
        viewerUserId: ids.owner,
        subjectUserId: ids.owner,
      }),
    ).resolves.toMatchObject({
      currentCompany: "Private Company",
      skills: ["Product design", "Research"],
    });

    await expect(
      getVisibleCareerProfile(execute, {
        viewerUserId: ids.member,
        subjectUserId: ids.owner,
        groupId: ids.group,
      }),
    ).resolves.toBeNull();
  });
});
