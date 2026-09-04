import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "@/server/db/schema/auth";
import { groups } from "@/server/db/schema/groups";

export const groupContentReports = pgTable(
  "group_content_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: text("target_type").$type<"job_share" | "message">().notNull(),
    targetId: uuid("target_id").notNull(),
    reason: text("reason").notNull(),
    details: text("details").notNull().default(""),
    status: text("status")
      .$type<"open" | "dismissed" | "actioned">()
      .notNull()
      .default("open"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("group_reports_reporter_target_unique").on(
      table.groupId,
      table.reporterId,
      table.targetType,
      table.targetId,
    ),
    index("group_reports_status_idx").on(table.groupId, table.status),
    check(
      "group_reports_target_check",
      sql`${table.targetType} in ('job_share', 'message')`,
    ),
    check(
      "group_reports_status_check",
      sql`${table.status} in ('open', 'dismissed', 'actioned')`,
    ),
    check(
      "group_reports_reason_check",
      sql`${table.reason} in ('off_topic', 'spam', 'harmful', 'other')`,
    ),
  ],
);

export const groupAdminEvents = pgTable(
  "group_admin_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    targetId: uuid("target_id"),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("group_admin_events_group_created_idx").on(
      table.groupId,
      table.createdAt,
    ),
  ],
);
