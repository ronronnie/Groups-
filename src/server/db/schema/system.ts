import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  DigestCadence,
  NotificationEventType,
} from "@/domains/notifications/events";
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
    activityEventId: uuid("activity_event_id"),
    type: text("type").$type<NotificationEventType>().notNull(),
    actionUrl: text("action_url"),
    dedupeKey: text("dedupe_key"),
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
    uniqueIndex("notifications_dedupe_key_unique").on(table.dedupeKey),
    foreignKey({
      columns: [table.activityEventId],
      foreignColumns: [activityEvents.id],
      name: "notifications_activity_event_id_activity_events_id_fk",
    }).onDelete("set null"),
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
    recipientUserId: uuid("recipient_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    eventType: text("event_type").$type<NotificationEventType>().notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    visibility: text("visibility")
      .$type<ActivityVisibility>()
      .notNull()
      .default("group"),
    metadata: jsonObject<JsonObject>("metadata"),
    dedupeKey: text("dedupe_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("activity_events_group_created_idx").on(
      table.groupId,
      table.createdAt,
    ),
    index("activity_events_recipient_created_idx").on(
      table.recipientUserId,
      table.createdAt,
    ),
    uniqueIndex("activity_events_dedupe_key_unique").on(table.dedupeKey),
    check(
      "activity_events_visibility_check",
      sql`${table.visibility} in ('private', 'group', 'admin')`,
    ),
  ],
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    inAppEnabled: boolean("in_app_enabled").notNull().default(true),
    strongMatchesEnabled: boolean("strong_matches_enabled")
      .notNull()
      .default(true),
    referralRequestsEnabled: boolean("referral_requests_enabled")
      .notNull()
      .default(true),
    applicationRemindersEnabled: boolean("application_reminders_enabled")
      .notNull()
      .default(true),
    jobActivityEnabled: boolean("job_activity_enabled").notNull().default(true),
    groupActivityEnabled: boolean("group_activity_enabled")
      .notNull()
      .default(true),
    digestCadence: text("digest_cadence")
      .$type<DigestCadence>()
      .notNull()
      .default("weekly"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "notification_preferences_digest_cadence_check",
      sql`${table.digestCadence} in ('daily', 'weekly', 'off')`,
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
