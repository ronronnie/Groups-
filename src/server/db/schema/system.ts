import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "@/server/db/schema/auth";
import { groups } from "@/server/db/schema/groups";
import { jsonObject, type JsonObject } from "@/server/db/schema/shared";

const activityVisibilities = ["private", "group", "admin"] as const;
type ActivityVisibility = (typeof activityVisibilities)[number];

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: uuid("group_id").references(() => groups.id, {
      onDelete: "cascade",
    }),
    type: text("type").notNull(),
    payload: jsonObject<JsonObject>("payload"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notifications_user_read_created_idx").on(
      table.userId,
      table.readAt,
      table.createdAt,
    ),
  ],
);

export const activityEvents = pgTable(
  "activity_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    eventType: text("event_type").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    visibility: text("visibility")
      .$type<ActivityVisibility>()
      .notNull()
      .default("group"),
    metadata: jsonObject<JsonObject>("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("activity_events_group_created_idx").on(
      table.groupId,
      table.createdAt,
    ),
    check(
      "activity_events_visibility_check",
      sql`${table.visibility} in ('private', 'group', 'admin')`,
    ),
  ],
);

export const aiUsageEvents = pgTable(
  "ai_usage_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    groupId: uuid("group_id").references(() => groups.id, {
      onDelete: "set null",
    }),
    feature: text("feature").notNull(),
    modelAlias: text("model_alias").notNull(),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    estimatedCostUsd: numeric("estimated_cost_usd", {
      precision: 12,
      scale: 6,
    }),
    requestId: text("request_id"),
    metadata: jsonObject<JsonObject>("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("ai_usage_events_group_feature_created_idx").on(
      table.groupId,
      table.feature,
      table.createdAt,
    ),
    index("ai_usage_events_user_created_idx").on(table.userId, table.createdAt),
    check(
      "ai_usage_events_token_counts_check",
      sql`(${table.promptTokens} is null or ${table.promptTokens} >= 0) and (${table.completionTokens} is null or ${table.completionTokens} >= 0)`,
    ),
  ],
);

export { activityVisibilities };
export type { ActivityVisibility };
