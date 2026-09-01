import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "@/server/db/schema/auth";
import { groups } from "@/server/db/schema/groups";
import { jobs } from "@/server/db/schema/jobs";

const threadKinds = ["general", "job"] as const;
type ThreadKind = (typeof threadKinds)[number];

export const messageThreads = pgTable(
  "message_threads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    jobId: uuid("job_id").references(() => jobs.id, { onDelete: "restrict" }),
    kind: text("kind").$type<ThreadKind>().notNull(),
    title: text("title"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("message_threads_id_group_unique").on(table.id, table.groupId),
    uniqueIndex("message_threads_general_group_unique")
      .on(table.groupId)
      .where(sql`${table.kind} = 'general'`),
    uniqueIndex("message_threads_job_group_unique")
      .on(table.groupId, table.jobId)
      .where(sql`${table.kind} = 'job'`),
    index("message_threads_group_updated_idx").on(
      table.groupId,
      table.updatedAt,
    ),
    check(
      "message_threads_context_check",
      sql`(${table.kind} = 'general' and ${table.jobId} is null) or (${table.kind} = 'job' and ${table.jobId} is not null)`,
    ),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id").notNull(),
    threadId: uuid("thread_id").notNull(),
    authorId: uuid("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    replyToId: uuid("reply_to_id"),
    body: text("body").notNull(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("messages_id_thread_group_unique").on(
      table.id,
      table.threadId,
      table.groupId,
    ),
    foreignKey({
      columns: [table.threadId, table.groupId],
      foreignColumns: [messageThreads.id, messageThreads.groupId],
      name: "messages_thread_group_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.replyToId, table.threadId, table.groupId],
      foreignColumns: [table.id, table.threadId, table.groupId],
      name: "messages_reply_context_fk",
    }).onDelete("cascade"),
    index("messages_thread_created_idx").on(table.threadId, table.createdAt),
    index("messages_group_created_idx").on(table.groupId, table.createdAt),
    check("messages_body_check", sql`length(trim(${table.body})) > 0`),
  ],
);

export { threadKinds };
export type { ThreadKind };
