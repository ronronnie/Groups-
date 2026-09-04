import { isNull, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  pgView,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import { users } from "@/server/db/schema/auth";
import { groups } from "@/server/db/schema/groups";
import { jsonArray, timestamps } from "@/server/db/schema/shared";

const workModes = ["remote", "hybrid", "onsite", "unspecified"] as const;
const employmentTypes = [
  "full_time",
  "part_time",
  "contract",
  "internship",
  "temporary",
  "unspecified",
] as const;
const jobStatuses = ["active", "expired", "closed", "draft"] as const;

type WorkMode = (typeof workModes)[number];
type EmploymentType = (typeof employmentTypes)[number];
type JobStatus = (typeof jobStatuses)[number];

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    canonicalUrl: text("canonical_url").notNull(),
    company: text("company").notNull(),
    title: text("title").notNull(),
    descriptionSummary: text("description_summary").notNull().default(""),
    descriptionText: text("description_text").notNull().default(""),
    location: text("location").notNull().default(""),
    workMode: text("work_mode")
      .$type<WorkMode>()
      .notNull()
      .default("unspecified"),
    employmentType: text("employment_type")
      .$type<EmploymentType>()
      .notNull()
      .default("unspecified"),
    experienceMin: integer("experience_min"),
    experienceMax: integer("experience_max"),
    skills: jsonArray<string>("skills"),
    salaryText: text("salary_text"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    source: text("source").notNull(),
    status: text("status").$type<JobStatus>().notNull().default("active"),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("jobs_canonical_url_unique").on(table.canonicalUrl),
    index("jobs_company_title_idx").on(table.company, table.title),
    index("jobs_status_posted_at_idx").on(table.status, table.postedAt),
    check(
      "jobs_work_mode_check",
      sql`${table.workMode} in ('remote', 'hybrid', 'onsite', 'unspecified')`,
    ),
    check(
      "jobs_employment_type_check",
      sql`${table.employmentType} in ('full_time', 'part_time', 'contract', 'internship', 'temporary', 'unspecified')`,
    ),
    check(
      "jobs_status_check",
      sql`${table.status} in ('active', 'expired', 'closed', 'draft')`,
    ),
    check(
      "jobs_experience_range_check",
      sql`(${table.experienceMin} is null or ${table.experienceMin} >= 0) and (${table.experienceMax} is null or ${table.experienceMax} >= ${table.experienceMin})`,
    ),
  ],
);

export const jobShares = pgTable(
  "job_shares",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    sharerId: uuid("sharer_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    note: text("note"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    sharedAt: timestamp("shared_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("job_shares_group_job_sharer_unique").on(
      table.groupId,
      table.jobId,
      table.sharerId,
    ),
    index("job_shares_group_shared_at_idx").on(table.groupId, table.sharedAt),
    index("job_shares_job_id_idx").on(table.jobId),
    index("job_shares_sharer_id_idx").on(table.sharerId),
  ],
);

export const activeJobShares = pgView("active_job_shares").as((query) =>
  query.select().from(jobShares).where(isNull(jobShares.archivedAt)),
);

export const jobEmbeddings = pgTable(
  "job_embeddings",
  {
    jobId: uuid("job_id")
      .primaryKey()
      .references(() => jobs.id, { onDelete: "cascade" }),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    modelAlias: text("model_alias").notNull(),
    contentHash: text("content_hash").notNull(),
    ...timestamps(),
  },
  (table) => [
    index("job_embeddings_embedding_hnsw_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
    index("job_embeddings_model_alias_idx").on(table.modelAlias),
  ],
);

export const userJobStates = pgTable(
  "user_job_states",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    seen: boolean("seen").notNull().default(false),
    saved: boolean("saved").notNull().default(false),
    dismissed: boolean("dismissed").notNull().default(false),
    seenAt: timestamp("seen_at", { withTimezone: true }),
    savedAt: timestamp("saved_at", { withTimezone: true }),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.jobId] }),
    index("user_job_states_user_saved_idx").on(table.userId, table.saved),
  ],
);

export { employmentTypes, jobStatuses, workModes };
export type { EmploymentType, JobStatus, WorkMode };
