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
import { jobs } from "@/server/db/schema/jobs";
import { timestamps } from "@/server/db/schema/shared";
import { outcomeTypes, type OutcomeType } from "@/domains/outcomes/outcome";

const outcomeVisibilities = ["private", "group"] as const;

type OutcomeVisibility = (typeof outcomeVisibilities)[number];

export const outcomes = pgTable(
  "outcomes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "restrict" }),
    subjectUserId: uuid("subject_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sharedByUserId: uuid("shared_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    referredByUserId: uuid("referred_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    outcomeType: text("outcome_type").$type<OutcomeType>().notNull(),
    visibility: text("visibility")
      .$type<OutcomeVisibility>()
      .notNull()
      .default("private"),
    consentGrantedAt: timestamp("consent_granted_at", { withTimezone: true }),
    sharedAt: timestamp("shared_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    index("outcomes_group_created_idx").on(table.groupId, table.createdAt),
    index("outcomes_subject_user_idx").on(table.subjectUserId),
    uniqueIndex("outcomes_subject_job_type_unique").on(
      table.subjectUserId,
      table.jobId,
      table.outcomeType,
    ),
    check(
      "outcomes_type_check",
      sql`${table.outcomeType} in ('interview', 'offer', 'hired')`,
    ),
    check(
      "outcomes_visibility_check",
      sql`${table.visibility} in ('private', 'group')`,
    ),
    check(
      "outcomes_consent_check",
      sql`(${table.visibility} = 'private' and ${table.sharedAt} is null) or (${table.visibility} = 'group' and ${table.consentGrantedAt} is not null and ${table.sharedAt} is not null)`,
    ),
  ],
);

export { outcomeTypes, outcomeVisibilities };
export type { OutcomeType, OutcomeVisibility };
