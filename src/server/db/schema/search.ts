import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import type { AskGroupSourceKind } from "@/domains/search/ask-group";
import { groups } from "@/server/db/schema/groups";
import { timestamps } from "@/server/db/schema/shared";

export const groupKnowledgeDocuments = pgTable(
  "group_knowledge_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    sourceKey: text("source_key").notNull(),
    sourceKind: text("source_kind").$type<AskGroupSourceKind>().notNull(),
    sourceId: uuid("source_id").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    href: text("href").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    modelAlias: text("model_alias").notNull(),
    contentHash: text("content_hash").notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("group_knowledge_documents_source_unique").on(
      table.groupId,
      table.sourceKey,
    ),
    index("group_knowledge_documents_group_updated_idx").on(
      table.groupId,
      table.updatedAt,
    ),
    index("group_knowledge_documents_embedding_hnsw_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
    check(
      "group_knowledge_documents_kind_check",
      sql`${table.sourceKind} in ('job', 'job_share', 'discussion', 'profile', 'outcome', 'reputation')`,
    ),
    check(
      "group_knowledge_documents_content_check",
      sql`length(trim(${table.content})) > 0`,
    ),
  ],
);
