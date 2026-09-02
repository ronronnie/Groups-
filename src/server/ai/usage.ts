import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";

export type AiUsageSqlExecutor = <Row extends Record<string, unknown>>(
  query: SQL,
) => Promise<{ rows: Row[] }>;

export const aiUsageEventSchema = z.object({
  userId: z.string().uuid(),
  groupId: z.string().uuid(),
  feature: z.string().trim().min(1).max(80),
  modelAlias: z.string().trim().min(1).max(120),
  promptTokens: z.number().int().min(0).nullable(),
  completionTokens: z.number().int().min(0).nullable(),
  requestId: z.string().trim().max(255).nullable(),
  metadata: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean()]),
  ),
});

export type AiUsageEvent = z.infer<typeof aiUsageEventSchema>;
export type AiUsageRecorder = (event: AiUsageEvent) => Promise<void>;

export async function recordAiUsageEvent(
  execute: AiUsageSqlExecutor,
  event: AiUsageEvent,
) {
  const values = aiUsageEventSchema.parse(event);

  await execute(sql`
    insert into ai_usage_events (
      user_id,
      group_id,
      feature,
      model_alias,
      prompt_tokens,
      completion_tokens,
      request_id,
      metadata
    ) values (
      ${values.userId},
      ${values.groupId},
      ${values.feature},
      ${values.modelAlias},
      ${values.promptTokens},
      ${values.completionTokens},
      ${values.requestId},
      ${JSON.stringify(values.metadata)}::jsonb
    )
  `);
}
