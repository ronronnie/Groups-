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

const referralStates = [
  "pending",
  "accepted",
  "declined",
  "withdrawn",
  "completed",
] as const;

type ReferralState = (typeof referralStates)[number];

export const referralRequests = pgTable(
  "referral_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    potentialReferrerId: uuid("potential_referrer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "restrict" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    state: text("state").$type<ReferralState>().notNull().default("pending"),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("referral_requests_active_unique")
      .on(
        table.requesterId,
        table.potentialReferrerId,
        table.jobId,
        table.groupId,
      )
      .where(sql`${table.state} in ('pending', 'accepted')`),
    index("referral_requests_requester_state_idx").on(
      table.requesterId,
      table.state,
    ),
    index("referral_requests_referrer_state_idx").on(
      table.potentialReferrerId,
      table.state,
    ),
    index("referral_requests_group_id_idx").on(table.groupId),
    check(
      "referral_requests_distinct_users_check",
      sql`${table.requesterId} <> ${table.potentialReferrerId}`,
    ),
    check(
      "referral_requests_state_check",
      sql`${table.state} in ('pending', 'accepted', 'declined', 'withdrawn', 'completed')`,
    ),
  ],
);

export { referralStates };
export type { ReferralState };
