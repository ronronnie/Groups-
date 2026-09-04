import { z } from "zod";
import {
  askGroupQuestionSchema,
  askGroupResponseSchema,
  generatedGroupAnswerSchema,
  type AskGroupResponse,
  type AskGroupSource,
} from "@/domains/search/ask-group";
import type { GroupAnswerModelResponse } from "@/server/ai/group-answer";
import type { GroupEmbeddingResponse } from "@/server/ai/group-embedding";
import type { AiUsageEvent, AiUsageRecorder } from "@/server/ai/usage";
import {
  deleteIndexedDocuments,
  hashKnowledgeSource,
  isActiveGroupMember,
  listAuthorizedKnowledgeSources,
  listIndexedDocuments,
  listViewerSavedJobSources,
  pruneIndexedDocuments,
  rankKnowledgeLexically,
  searchIndexedKnowledge,
  upsertIndexedDocument,
  type KnowledgeSource,
  type SearchSqlExecutor,
} from "@/server/search/retrieval";

const contextSchema = z.object({
  groupId: z.string().uuid(),
  groupSlug: z.string().trim().min(1).max(80),
  userId: z.string().uuid(),
});

export type GroupEmbeddingRequest = (
  inputs: string[],
  model: string,
) => Promise<GroupEmbeddingResponse>;

export type GroupAnswerRequest = (
  question: string,
  sources: AskGroupSource[],
  model: string,
) => Promise<GroupAnswerModelResponse>;

type AskGroupDependencies = {
  execute: SearchSqlExecutor;
  embeddingModel: string;
  responseModel: string;
  embed: GroupEmbeddingRequest;
  answer: GroupAnswerRequest;
  recordUsage: AiUsageRecorder;
};

function needsSavedJobContext(question: string) {
  return /\b(saved?|bookmarked?|appl(?:y|ied|ication|ications))\b/i.test(
    question,
  );
}

async function recordUsageSafely(
  recorder: AiUsageRecorder,
  event: AiUsageEvent,
) {
  try {
    await recorder(event);
  } catch {
    // Search should remain available if observability is temporarily unavailable.
  }
}

function toSource(source: KnowledgeSource, score: number): AskGroupSource {
  return {
    key: source.key,
    kind: source.kind,
    title: source.title,
    excerpt: source.content.slice(0, 500),
    href: source.href,
    score,
  };
}

function mergeSources(primary: AskGroupSource[], secondary: AskGroupSource[]) {
  const merged = new Map<string, AskGroupSource>();
  for (const source of [...primary, ...secondary]) {
    if (!merged.has(source.key)) merged.set(source.key, source);
  }
  return [...merged.values()].slice(0, 6);
}

function fallbackAnswer(sources: AskGroupSource[]) {
  if (!sources.length) {
    return "I couldn't find a strong match in this group yet. Try a role, company, skill, location, or member name.";
  }
  if (sources.length === 1) {
    return "I found one relevant result in this group. Open it below to review the details and take the next step.";
  }
  return `I found ${sources.length} relevant results in this group. Start with the highest-ranked result below.`;
}

function embeddingUsageEvent(
  context: z.infer<typeof contextSchema>,
  model: string,
  status: "success" | "error",
  indexedSourceCount: number,
  promptTokens: number | null = null,
): AiUsageEvent {
  return {
    userId: context.userId,
    groupId: context.groupId,
    feature: "group_search_embedding",
    modelAlias: model,
    promptTokens,
    completionTokens: null,
    requestId: null,
    metadata: { status, indexedSourceCount },
  };
}

function answerUsageEvent(
  context: z.infer<typeof contextSchema>,
  model: string,
  status: "success" | "invalid_output" | "error",
  sourceCount: number,
  response?: GroupAnswerModelResponse,
): AiUsageEvent {
  return {
    userId: context.userId,
    groupId: context.groupId,
    feature: "group_search_answer",
    modelAlias: model,
    promptTokens: response?.promptTokens ?? null,
    completionTokens: response?.completionTokens ?? null,
    requestId: response?.requestId ?? null,
    metadata: { status, sourceCount },
  };
}

async function retrieveSources(
  question: string,
  context: z.infer<typeof contextSchema>,
  publicSources: KnowledgeSource[],
  privateSources: KnowledgeSource[],
  dependencies: AskGroupDependencies,
) {
  const { execute, embed, embeddingModel, recordUsage } = dependencies;
  const hashes = new Map(
    publicSources.map((source) => [source.key, hashKnowledgeSource(source)]),
  );
  await pruneIndexedDocuments(
    execute,
    context.groupId,
    publicSources.map((source) => source.key),
  );
  const existing = new Map(
    (await listIndexedDocuments(execute, context.groupId)).map((document) => [
      document.sourceKey,
      document,
    ]),
  );
  const changedSources = publicSources.filter((source) => {
    const document = existing.get(source.key);
    return (
      !document ||
      document.contentHash !== hashes.get(source.key) ||
      document.modelAlias !== embeddingModel
    );
  });

  // Remove changed rows before re-embedding so stale private fields can never be retrieved.
  await deleteIndexedDocuments(
    execute,
    context.groupId,
    changedSources.map((source) => source.key),
  );

  try {
    const response = await embed(
      [question, ...changedSources.map((source) => source.content)],
      embeddingModel,
    );
    const [questionEmbedding, ...sourceEmbeddings] = response.vectors;
    if (!questionEmbedding) throw new Error("Question embedding is missing.");

    for (const [index, source] of changedSources.entries()) {
      const embedding = sourceEmbeddings[index];
      if (!embedding) throw new Error("A source embedding is missing.");
      await upsertIndexedDocument(execute, {
        groupId: context.groupId,
        modelAlias: embeddingModel,
        source,
        embedding,
        contentHash: hashes.get(source.key)!,
      });
    }

    await recordUsageSafely(
      recordUsage,
      embeddingUsageEvent(
        context,
        embeddingModel,
        "success",
        changedSources.length,
        response.promptTokens,
      ),
    );
    const vectorSources = await searchIndexedKnowledge(execute, {
      groupId: context.groupId,
      viewerId: context.userId,
      embedding: questionEmbedding,
    });
    return mergeSources(
      privateSources.map((source) => toSource(source, 1)),
      vectorSources,
    );
  } catch {
    await recordUsageSafely(
      recordUsage,
      embeddingUsageEvent(
        context,
        embeddingModel,
        "error",
        changedSources.length,
      ),
    );
    return rankKnowledgeLexically(
      question,
      [...privateSources, ...publicSources],
      6,
    );
  }
}

export async function askGroup(
  rawQuestion: string,
  rawContext: { groupId: string; groupSlug: string; userId: string },
  dependencies: AskGroupDependencies,
): Promise<AskGroupResponse | null> {
  const question = askGroupQuestionSchema.parse(rawQuestion);
  const context = contextSchema.parse(rawContext);
  const allowed = await isActiveGroupMember(dependencies.execute, {
    groupId: context.groupId,
    groupSlug: context.groupSlug,
    userId: context.userId,
  });
  if (!allowed) return null;

  const publicSources = await listAuthorizedKnowledgeSources(
    dependencies.execute,
    { ...context, viewerId: context.userId },
  );
  const privateSources = needsSavedJobContext(question)
    ? await listViewerSavedJobSources(dependencies.execute, {
        ...context,
        viewerId: context.userId,
      })
    : [];
  const sources = await retrieveSources(
    question,
    context,
    publicSources,
    privateSources,
    dependencies,
  );

  if (!sources.length) {
    return askGroupResponseSchema.parse({
      answer: fallbackAnswer(sources),
      sources,
      mode: "fallback",
    });
  }

  try {
    const response = await dependencies.answer(
      question,
      sources,
      dependencies.responseModel,
    );
    const parsed = generatedGroupAnswerSchema.safeParse(response.output);
    if (!parsed.success) {
      await recordUsageSafely(
        dependencies.recordUsage,
        answerUsageEvent(
          context,
          dependencies.responseModel,
          "invalid_output",
          sources.length,
          response,
        ),
      );
      throw new Error("The answer did not match the expected structure.");
    }

    const citedKeys = new Set(parsed.data.citedSourceKeys);
    const citedSources = sources.filter((source) => citedKeys.has(source.key));
    const displayedSources = citedSources.length
      ? citedSources
      : sources.slice(0, 3);
    await recordUsageSafely(
      dependencies.recordUsage,
      answerUsageEvent(
        context,
        dependencies.responseModel,
        "success",
        displayedSources.length,
        response,
      ),
    );
    return askGroupResponseSchema.parse({
      answer: parsed.data.answer,
      sources: displayedSources,
      mode: "ai",
    });
  } catch (error) {
    if (!(
      error instanceof Error && error.message.includes("expected structure")
    )) {
      await recordUsageSafely(
        dependencies.recordUsage,
        answerUsageEvent(
          context,
          dependencies.responseModel,
          "error",
          sources.length,
        ),
      );
    }
    return askGroupResponseSchema.parse({
      answer: fallbackAnswer(sources),
      sources,
      mode: "fallback",
    });
  }
}
