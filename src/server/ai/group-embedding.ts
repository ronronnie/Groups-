import "server-only";

import { z } from "zod";
import { createOpenAIClient } from "@/server/ai/openai";

const EMBEDDING_DIMENSIONS = 1536;
const embeddingVectorSchema = z.array(z.number()).length(EMBEDDING_DIMENSIONS);

export type GroupEmbeddingResponse = {
  vectors: number[][];
  promptTokens: number | null;
};

export async function requestGroupEmbeddings(
  inputs: string[],
  model: string,
): Promise<GroupEmbeddingResponse> {
  const values = z
    .array(z.string().trim().min(1).max(4_000))
    .min(1)
    .max(256)
    .parse(inputs);
  const client = createOpenAIClient();
  const response = await client.embeddings.create(
    {
      model,
      input: values,
      dimensions: EMBEDDING_DIMENSIONS,
      encoding_format: "float",
    },
    { maxRetries: 0, timeout: 12_000 },
  );
  const ordered = [...response.data].sort((a, b) => a.index - b.index);
  const vectors = ordered.map((item) =>
    embeddingVectorSchema.parse(item.embedding),
  );

  if (vectors.length !== values.length) {
    throw new Error(
      "The embedding response did not match the requested inputs.",
    );
  }

  return {
    vectors,
    promptTokens: response.usage?.prompt_tokens ?? null,
  };
}
