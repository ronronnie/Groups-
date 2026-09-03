// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  ChatModerationError,
  getGeneralChatRoomName,
} from "@/domains/chat/policy";
import {
  createGeneralChatMessage,
  listGeneralChatMessages,
  type ChatSqlExecutor,
} from "@/server/chat/service";
import {
  issueGeneralChatToken,
  type ChatTokenIssuer,
} from "@/server/chat/token-service";

const ids = {
  owner: "70000000-0000-4000-8000-000000000101",
  member: "70000000-0000-4000-8000-000000000102",
  outsider: "70000000-0000-4000-8000-000000000103",
  group: "70000000-0000-4000-8000-000000000201",
};

function readMigrations() {
  const directory = path.resolve(process.cwd(), "drizzle");
  return readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(path.join(directory, file), "utf8"));
}

describe("general chat", () => {
  let client: PGlite;
  let execute: ChatSqlExecutor;

  beforeAll(async () => {
    client = await PGlite.create({ extensions: { vector } });
    for (const migration of readMigrations()) await client.exec(migration);

    await client.query(
      `insert into users (id, name, email, email_verified)
       values ($1, 'Chat Owner', 'chat-owner@example.test', true),
              ($2, 'Active Member', 'chat-member@example.test', true),
              ($3, 'Outsider', 'chat-outsider@example.test', true)`,
      [ids.owner, ids.member, ids.outsider],
    );
    await client.query(
      `insert into groups (id, name, slug, engine_key, owner_id)
       values ($1, 'Chat Jobs', 'chat-jobs', 'jobs', $2)`,
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

  afterAll(async () => client.close());

  it("persists messages in one group-scoped general thread", async () => {
    const first = await createGeneralChatMessage(execute, {
      groupId: ids.group,
      authorId: ids.member,
      body: "  Is anyone attending the meetup?  ",
    });
    const second = await createGeneralChatMessage(execute, {
      groupId: ids.group,
      authorId: ids.owner,
      body: "I will be there at six.",
    });

    expect(first).toMatchObject({
      authorName: "Active Member",
      body: "Is anyone attending the meetup?",
    });
    expect(second?.authorName).toBe("Chat Owner");
    await expect(
      listGeneralChatMessages(execute, {
        groupId: ids.group,
        viewerId: ids.member,
      }),
    ).resolves.toMatchObject([
      { body: "Is anyone attending the meetup?" },
      { body: "I will be there at six." },
    ]);

    const threads = await client.query<{ count: number; jobId: string | null }>(
      `select count(*)::int as count, max(job_id::text) as "jobId"
       from message_threads
       where group_id = $1 and kind = 'general'`,
      [ids.group],
    );
    expect(threads.rows[0]).toEqual({ count: 1, jobId: null });
  });

  it("denies message reads and writes to non-members", async () => {
    await expect(
      createGeneralChatMessage(execute, {
        groupId: ids.group,
        authorId: ids.outsider,
        body: "This must not be visible.",
      }),
    ).resolves.toBeNull();
    await expect(
      listGeneralChatMessages(execute, {
        groupId: ids.group,
        viewerId: ids.outsider,
      }),
    ).resolves.toBeNull();
  });

  it("runs moderation before persistence", async () => {
    await expect(
      createGeneralChatMessage(execute, {
        groupId: ids.group,
        authorId: ids.member,
        body: "!!!!!!!!!!!!!!!!!!!!!!!!",
      }),
    ).rejects.toBeInstanceOf(ChatModerationError);
  });

  it("issues one-hour tokens scoped to the member's group room", async () => {
    const tokenRequest = {
      capability: "signed-capability",
      clientId: ids.member,
      keyName: "test.key",
      mac: "test-mac",
      nonce: "0123456789abcdef",
      timestamp: 1,
      ttl: 3_600_000,
    };
    const issueToken = vi.fn<ChatTokenIssuer>().mockResolvedValue(tokenRequest);

    await expect(
      issueGeneralChatToken(execute, issueToken, {
        groupId: ids.group,
        userId: ids.member,
      }),
    ).resolves.toEqual(tokenRequest);
    expect(issueToken).toHaveBeenCalledWith({
      capability: {
        [getGeneralChatRoomName(ids.group)]: ["publish", "subscribe"],
      },
      clientId: ids.member,
      ttl: 3_600_000,
    });
  });

  it("does not issue a chat token to a non-member", async () => {
    const issueToken = vi.fn<ChatTokenIssuer>();

    await expect(
      issueGeneralChatToken(execute, issueToken, {
        groupId: ids.group,
        userId: ids.outsider,
      }),
    ).resolves.toBeNull();
    expect(issueToken).not.toHaveBeenCalled();
  });
});
