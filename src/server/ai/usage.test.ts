// @vitest-environment node

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { recordAiUsageEvent, type AiUsageSqlExecutor } from "@/server/ai/usage";

describe("AI usage logging", () => {
  let client: PGlite;
  let execute: AiUsageSqlExecutor;

  beforeAll(async () => {
    client = await PGlite.create();
    await client.exec(`
      create table ai_usage_events (
        id uuid primary key default gen_random_uuid(),
        user_id uuid,
        group_id uuid,
        feature text not null,
        model_alias text not null,
        prompt_tokens integer,
        completion_tokens integer,
        request_id text,
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      );
    `);
    const database = drizzle(client);
    execute = async <Row extends Record<string, unknown>>(
      query: Parameters<typeof database.execute>[0],
    ) => {
      const result = await database.execute(query);
      return { rows: result.rows as Row[] };
    };
  });

  afterAll(async () => {
    await client.close();
  });

  it("stores operational metadata without prompt content", async () => {
    await recordAiUsageEvent(execute, {
      userId: "10000000-0000-4000-8000-000000000001",
      groupId: "20000000-0000-4000-8000-000000000001",
      feature: "job_extraction",
      modelAlias: "test-model",
      promptTokens: 50,
      completionTokens: 25,
      requestId: "resp_test",
      metadata: {
        attempt: 1,
        inputKind: "url_and_text",
        status: "success",
        confidence: 0.9,
      },
    });

    const result = await client.query<{
      feature: string;
      metadata: Record<string, unknown>;
    }>("select feature, metadata from ai_usage_events");

    expect(result.rows[0]).toMatchObject({
      feature: "job_extraction",
      metadata: { status: "success", confidence: 0.9 },
    });
    expect(JSON.stringify(result.rows[0])).not.toContain("job description");
  });
});
