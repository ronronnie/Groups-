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

const applicationStatuses = [
  "not_applied",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
  "hired",
] as const;
const applicationVisibilities = ["private", "referrers", "group"] as const;

type ApplicationStatus = (typeof applicationStatuses)[number];
type ApplicationVisibility = (typeof applicationVisibilities)[number];

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "restrict" }),
    sourceGroupId: uuid("source_group_id").references(() => groups.id, {
      onDelete: "set null",
    }),
    status: text("status")
      .$type<ApplicationStatus>()
      .notNull()
      .default("not_applied"),
    visibility: text("visibility")
      .$type<ApplicationVisibility>()
      .notNull()
      .default("private"),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("applications_user_job_unique").on(table.userId, table.jobId),
    index("applications_user_status_idx").on(table.userId, table.status),
    index("applications_source_group_id_idx").on(table.sourceGroupId),
    check(
      "applications_status_check",
      sql`${table.status} in ('not_applied', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn', 'hired')`,
    ),
    check(
      "applications_visibility_check",
      sql`${table.visibility} in ('private', 'referrers', 'group')`,
    ),
  ],
);

export const applicationStatusEvents = pgTable(
  "application_status_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    fromStatus: text("from_status").$type<ApplicationStatus>(),
    toStatus: text("to_status").$type<ApplicationStatus>().notNull(),
    changedByUserId: uuid("changed_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("application_status_events_application_created_idx").on(
      table.applicationId,
      table.createdAt,
    ),
    check(
      "application_status_events_from_check",
      sql`${table.fromStatus} is null or ${table.fromStatus} in ('not_applied', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn', 'hired')`,
    ),
    check(
      "application_status_events_to_check",
      sql`${table.toStatus} in ('not_applied', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn', 'hired')`,
    ),
  ],
);

export { applicationStatuses, applicationVisibilities };
export type { ApplicationStatus, ApplicationVisibility };
