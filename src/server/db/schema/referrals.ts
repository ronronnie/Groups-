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
import {
  referralStates,
  type ReferralState,
} from "@/domains/referrals/workflow";
import { groups } from "@/server/db/schema/groups";
import { jobs } from "@/server/db/schema/jobs";
import { timestamps } from "@/server/db/schema/shared";

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
    state: text("state").$type<ReferralState>().notNull().default("requested"),
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
      .where(
        sql`${table.state} in ('requested', 'accepted', 'needs_info', 'referred')`,
      ),
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
      sql`${table.state} in ('requested', 'accepted', 'declined', 'needs_info', 'referred', 'closed')`,
    ),
  ],
);

export const referralRequestStateEvents = pgTable(
  "referral_request_state_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => referralRequests.id, { onDelete: "cascade" }),
    fromState: text("from_state").$type<ReferralState>(),
    toState: text("to_state").$type<ReferralState>().notNull(),
    changedByUserId: uuid("changed_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("referral_request_events_request_created_idx").on(
      table.requestId,
      table.createdAt,
    ),
    check(
      "referral_request_events_from_check",
      sql`${table.fromState} is null or ${table.fromState} in ('requested', 'accepted', 'declined', 'needs_info', 'referred', 'closed')`,
    ),
    check(
      "referral_request_events_to_check",
      sql`${table.toState} in ('requested', 'accepted', 'declined', 'needs_info', 'referred', 'closed')`,
    ),
  ],
);

export { referralStates };
export type { ReferralState };
