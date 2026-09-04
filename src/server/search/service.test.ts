// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import type { SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type {
  GroupEmbeddingRequest,
  GroupAnswerRequest,
} from "@/server/search/service";
import { askGroup } from "@/server/search/service";
import type { SearchSqlExecutor } from "@/server/search/retrieval";
import type { AiUsageEvent } from "@/server/ai/usage";

const viewerId = "11000000-0000-4000-8000-000000000001";
const outsiderId = "11000000-0000-4000-8000-000000000002";
const groupId = "22000000-0000-4000-8000-000000000001";
const jobId = "33000000-0000-4000-8000-000000000001";

function readMigrations() {
  const directory = path.resolve(process.cwd(), "drizzle");
  return readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(path.join(directory, file), "utf8"));
}

function vector1536() {
  return [1, ...Array.from({ length: 1535 }, () => 0)];
}

describe("Ask this Group service", () => {
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
        ('${viewerId}', 'Viewer', 'ask-viewer@example.test', true),
        ('${outsiderId}', 'Outsider', 'ask-outsider@example.test', true);
      insert into groups (id, name, slug, engine_key, owner_id)
        values ('${groupId}', 'Search Group', 'search-group', 'jobs', '${viewerId}');
      insert into group_memberships (group_id, user_id, role, status)
        values ('${groupId}', '${viewerId}', 'owner', 'active');
      insert into jobs (id, canonical_url, company, title, description_summary, location, work_mode, skills, source)
        values ('${jobId}', 'https://search.example.test/job', 'Orbit Foundry', 'React Designer', 'Build accessible design systems', 'Remote', 'remote', '["React", "Accessibility"]', 'test');
      insert into job_shares (group_id, job_id, sharer_id)
        values ('${groupId}', '${jobId}', '${viewerId}');
      insert into user_job_states (user_id, job_id, seen, saved, saved_at)
        values ('${viewerId}', '${jobId}', true, true, now());
    `);
  }, 30_000);

  afterAll(async () => {
    await client.close();
  });

  function dependencies(answer: GroupAnswerRequest) {
    const events: AiUsageEvent[] = [];
    const embed: GroupEmbeddingRequest = vi.fn(async (inputs) => ({
      vectors: inputs.map(() => vector1536()),
      promptTokens: 42,
    }));
    return {
      events,
      embed,
      values: {
        execute,
        embeddingModel: "test-embedding",
        responseModel: "test-response",
        embed,
        answer,
        recordUsage: vi.fn(async (event: AiUsageEvent) => {
          events.push(event);
        }),
      },
    };
  }

  it("rejects non-members before invoking either model", async () => {
    const answer = vi.fn<GroupAnswerRequest>();
    const { embed, values } = dependencies(answer);
    const result = await askGroup(
      "Show remote React roles",
      { groupId, groupSlug: "search-group", userId: outsiderId },
      values,
    );

    expect(result).toBeNull();
    expect(embed).not.toHaveBeenCalled();
    expect(answer).not.toHaveBeenCalled();
  });

  it("returns validated citations and logs no raw question content", async () => {
    const answer = vi.fn<GroupAnswerRequest>(async (_question, sources) => ({
      output: {
        answer: "Review the React Designer role first, then open its details.",
        citedSourceKeys: [sources[0]!.key],
      },
      requestId: "resp_group_test",
      promptTokens: 80,
      completionTokens: 30,
    }));
    const { events, values } = dependencies(answer);
    const question = "What jobs did I save but not apply to?";
    const result = await askGroup(
      question,
      { groupId, groupSlug: "search-group", userId: viewerId },
      values,
    );

    expect(result).toMatchObject({
      mode: "ai",
      answer: "Review the React Designer role first, then open its details.",
      sources: [
        {
          key: `job:${jobId}`,
          excerpt: expect.stringContaining("Saved by you and not yet applied"),
        },
      ],
    });
    expect(events.map((event) => event.feature)).toEqual([
      "group_search_embedding",
      "group_search_answer",
    ]);
    expect(JSON.stringify(events)).not.toContain(question);
  });

  it("falls back to linked results when answer generation fails", async () => {
    const answer = vi
      .fn<GroupAnswerRequest>()
      .mockRejectedValue(new Error("AI unavailable"));
    const { events, values } = dependencies(answer);
    const result = await askGroup(
      "Show remote React roles",
      { groupId, groupSlug: "search-group", userId: viewerId },
      values,
    );

    expect(result?.mode).toBe("fallback");
    expect(result?.sources[0]?.href).toContain(`/jobs/${jobId}`);
    expect(events.at(-1)?.metadata.status).toBe("error");
  });
});
