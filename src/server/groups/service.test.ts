// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashInviteToken } from "@/server/groups/invite-token";
import {
  acceptGroupInvite,
  createGroupInvite,
  createGroupWithInvite,
  getInvitePreview,
  getMemberGroupBySlug,
  listManagedInvites,
  revokeGroupInvite,
  type GroupSqlExecutor,
} from "@/server/groups/service";

const ids = {
  owner: "10000000-0000-4000-8000-000000000101",
  member: "10000000-0000-4000-8000-000000000102",
  outsider: "10000000-0000-4000-8000-000000000103",
  limitedMember: "10000000-0000-4000-8000-000000000104",
};

const tokens = {
  initial: "A".repeat(43),
  expired: "B".repeat(43),
  revoked: "C".repeat(43),
  unauthorized: "D".repeat(43),
  exhausted: "E".repeat(43),
};

const now = new Date("2026-09-01T12:00:00.000Z");

function readMigrations() {
  const directory = path.resolve(process.cwd(), "drizzle");
  return readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(path.join(directory, file), "utf8"));
}

describe("group onboarding service", () => {
  let client: PGlite;
  let execute: GroupSqlExecutor;
  let groupId: string;
  let groupSlug: string;

  beforeAll(async () => {
    client = await PGlite.create({ extensions: { vector } });
    for (const migration of readMigrations()) {
      await client.exec(migration);
    }

    await client.query(
      `insert into users (id, name, email, email_verified)
       values ($1, 'Owner Demo', 'group-owner@example.test', true),
              ($2, 'Member Demo', 'group-member@example.test', true),
              ($3, 'Outsider Demo', 'group-outsider@example.test', true),
              ($4, 'Limited Demo', 'group-limited@example.test', true)`,
      [ids.owner, ids.member, ids.outsider, ids.limitedMember],
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

  it("creates a Jobs group, owner membership, and initial invite atomically", async () => {
    const created = await createGroupWithInvite(
      execute,
      {
        engineKey: "jobs",
        name: "Design Jobs Bengaluru",
        ownerId: ids.owner,
      },
      {
        now,
        slugSuffix: "test1234",
        tokenFactory: () => tokens.initial,
      },
    );
    groupId = created.groupId;
    groupSlug = created.groupSlug;

    expect(created).toMatchObject({
      groupName: "Design Jobs Bengaluru",
      groupSlug: "design-jobs-bengaluru-test1234",
      token: tokens.initial,
    });

    const persisted = await client.query<{
      engine_key: string;
      role: string;
      invite_count: number;
    }>(
      `select g.engine_key,
              gm.role,
              count(gi.id)::int as invite_count
       from groups g
       inner join group_memberships gm on gm.group_id = g.id
       left join group_invites gi on gi.group_id = g.id
       where g.id = $1 and gm.user_id = $2
       group by g.id, gm.role`,
      [groupId, ids.owner],
    );
    expect(persisted.rows[0]).toEqual({
      engine_key: "jobs",
      role: "owner",
      invite_count: 1,
    });
  });

  it("stores only the invite hash and returns a safe preview", async () => {
    const stored = await client.query<{ token_hash: string }>(
      "select token_hash from group_invites where group_id = $1",
      [groupId],
    );
    expect(stored.rows[0]?.token_hash).toBe(hashInviteToken(tokens.initial));
    expect(stored.rows[0]?.token_hash).not.toContain(tokens.initial);

    await expect(
      getInvitePreview(execute, tokens.initial, now),
    ).resolves.toMatchObject({
      groupId,
      groupName: "Design Jobs Bengaluru",
      groupSlug,
      memberCount: 1,
      status: "active",
    });
    await expect(
      getInvitePreview(execute, "not-a-token", now),
    ).resolves.toBeNull();
  });

  it("joins through an invite without duplicating membership or consuming twice", async () => {
    await expect(
      acceptGroupInvite(
        execute,
        { token: tokens.initial, userId: ids.member },
        now,
      ),
    ).resolves.toMatchObject({ groupId, groupSlug, alreadyMember: false });

    await expect(
      acceptGroupInvite(
        execute,
        { token: tokens.initial, userId: ids.member },
        now,
      ),
    ).resolves.toMatchObject({ groupId, groupSlug, alreadyMember: true });

    const state = await client.query<{
      memberships: number;
      use_count: number;
    }>(
      `select
         (select count(*)::int from group_memberships
          where group_id = $1 and user_id = $2) as memberships,
         (select use_count from group_invites
          where group_id = $1 and token_hash = $3) as use_count`,
      [groupId, ids.member, hashInviteToken(tokens.initial)],
    );
    expect(state.rows[0]).toEqual({ memberships: 1, use_count: 1 });
  });

  it("rejects expired and revoked invites", async () => {
    const expiredInvite = await createGroupInvite(
      execute,
      {
        expiresAt: new Date(now.getTime() + 60_000),
        groupId,
        inviterId: ids.owner,
        maxUses: null,
      },
      () => tokens.expired,
    );
    expect(expiredInvite).not.toBeNull();
    await client.query(
      "update group_invites set expires_at = $1 where token_hash = $2",
      [new Date(now.getTime() - 1), hashInviteToken(tokens.expired)],
    );

    await expect(
      getInvitePreview(execute, tokens.expired, now),
    ).resolves.toMatchObject({ status: "expired" });
    await expect(
      acceptGroupInvite(
        execute,
        { token: tokens.expired, userId: ids.outsider },
        now,
      ),
    ).resolves.toBeNull();

    const revokedInvite = await createGroupInvite(
      execute,
      {
        expiresAt: new Date(now.getTime() + 60_000),
        groupId,
        inviterId: ids.owner,
        maxUses: 10,
      },
      () => tokens.revoked,
    );
    expect(revokedInvite).not.toBeNull();
    await expect(
      revokeGroupInvite(
        execute,
        {
          groupId,
          inviteId: revokedInvite!.id,
          userId: ids.owner,
        },
        now,
      ),
    ).resolves.toBe(true);
    await expect(
      getInvitePreview(execute, tokens.revoked, now),
    ).resolves.toMatchObject({ status: "revoked" });
    await expect(
      acceptGroupInvite(
        execute,
        { token: tokens.revoked, userId: ids.outsider },
        now,
      ),
    ).resolves.toBeNull();
  });

  it("enforces optional invite use limits", async () => {
    const limitedInvite = await createGroupInvite(
      execute,
      {
        expiresAt: new Date(now.getTime() + 60_000),
        groupId,
        inviterId: ids.owner,
        maxUses: 1,
      },
      () => tokens.exhausted,
    );
    expect(limitedInvite).not.toBeNull();

    await expect(
      acceptGroupInvite(
        execute,
        { token: tokens.exhausted, userId: ids.limitedMember },
        now,
      ),
    ).resolves.toMatchObject({ alreadyMember: false });
    await expect(
      getInvitePreview(execute, tokens.exhausted, now),
    ).resolves.toMatchObject({ status: "exhausted" });
    await expect(
      acceptGroupInvite(
        execute,
        { token: tokens.exhausted, userId: ids.outsider },
        now,
      ),
    ).resolves.toBeNull();
  });

  it("enforces membership and invite-management authorization", async () => {
    await expect(
      getMemberGroupBySlug(execute, groupSlug, ids.outsider),
    ).resolves.toBeNull();
    await expect(
      listManagedInvites(execute, groupId, ids.outsider, now),
    ).resolves.toBeNull();
    await expect(
      createGroupInvite(
        execute,
        {
          expiresAt: new Date(now.getTime() + 60_000),
          groupId,
          inviterId: ids.outsider,
          maxUses: null,
        },
        () => tokens.unauthorized,
      ),
    ).resolves.toBeNull();
    await expect(
      revokeGroupInvite(
        execute,
        {
          groupId,
          inviteId: "20000000-0000-4000-8000-000000000999",
          userId: ids.outsider,
        },
        now,
      ),
    ).resolves.toBe(false);
  });
});
