import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "@/server/db/schema/auth";
import { groups } from "@/server/db/schema/groups";
import { jsonObject, type JsonObject } from "@/server/db/schema/shared";

const reputationEventTypes = [
  "job_shared",
  "job_saved_by_member",
  "application_attributed",
  "referral_completed",
  "interview_helped",
  "hire_helped",
] as const;

type ReputationEventType = (typeof reputationEventTypes)[number];

export const reputationEvents = pgTable(
  "reputation_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    recipientUserId: uuid("recipient_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    eventType: text("event_type").$type<ReputationEventType>().notNull(),
    sourceEntityType: text("source_entity_type").notNull(),
    sourceEntityId: uuid("source_entity_id").notNull(),
    points: integer("points").notNull().default(1),
    metadata: jsonObject<JsonObject>("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("reputation_events_group_recipient_created_idx").on(
      table.groupId,
      table.recipientUserId,
      table.createdAt,
    ),
    index("reputation_events_source_idx").on(
      table.sourceEntityType,
      table.sourceEntityId,
    ),
    check(
      "reputation_events_type_check",
      sql`${table.eventType} in ('job_shared', 'job_saved_by_member', 'application_attributed', 'referral_completed', 'interview_helped', 'hire_helped')`,
    ),
    check(
      "reputation_events_points_check",
      sql`${table.points} between -100 and 100`,
    ),
  ],
);

export const userReputationSummaries = pgTable(
  "user_reputation_summaries",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    totalPoints: integer("total_points").notNull().default(0),
    jobsShared: integer("jobs_shared").notNull().default(0),
    referralsCompleted: integer("referrals_completed").notNull().default(0),
    hiresHelped: integer("hires_helped").notNull().default(0),
    calculatedAt: timestamp("calculated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.groupId, table.userId] }),
    index("user_reputation_summaries_group_points_idx").on(
      table.groupId,
      table.totalPoints,
    ),
  ],
);

export { reputationEventTypes };
export type { ReputationEventType };
