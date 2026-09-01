import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "@/server/db/schema/auth";
import { jsonObject, timestamps } from "@/server/db/schema/shared";

const groupRoles = ["owner", "admin", "member"] as const;
const membershipStatuses = ["active", "left", "removed"] as const;

type GroupRole = (typeof groupRoles)[number];
type MembershipStatus = (typeof membershipStatuses)[number];
type GroupSettings = {
  allowMemberInvites?: boolean;
  defaultProfileVisibility?: "members" | "private";
};

export const groups = pgTable(
  "groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    engineKey: text("engine_key").$type<"jobs">().notNull(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    settings: jsonObject<GroupSettings>("settings"),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("groups_slug_unique").on(table.slug),
    index("groups_owner_id_idx").on(table.ownerId),
    check("groups_engine_key_check", sql`${table.engineKey} = 'jobs'`),
  ],
);

export const groupMemberships = pgTable(
  "group_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").$type<GroupRole>().notNull().default("member"),
    status: text("status")
      .$type<MembershipStatus>()
      .notNull()
      .default("active"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("group_memberships_group_user_unique").on(
      table.groupId,
      table.userId,
    ),
    index("group_memberships_user_id_idx").on(table.userId),
    index("group_memberships_group_status_idx").on(table.groupId, table.status),
    check(
      "group_memberships_role_check",
      sql`${table.role} in ('owner', 'admin', 'member')`,
    ),
    check(
      "group_memberships_status_check",
      sql`${table.status} in ('active', 'left', 'removed')`,
    ),
  ],
);

export const groupInvites = pgTable(
  "group_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    inviterId: uuid("inviter_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    maxUses: integer("max_uses"),
    useCount: integer("use_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("group_invites_token_hash_unique").on(table.tokenHash),
    index("group_invites_group_id_idx").on(table.groupId),
    index("group_invites_expires_at_idx").on(table.expiresAt),
    check(
      "group_invites_max_uses_check",
      sql`${table.maxUses} is null or ${table.maxUses} > 0`,
    ),
    check("group_invites_use_count_check", sql`${table.useCount} >= 0`),
  ],
);

export { groupRoles, membershipStatuses };
export type { GroupRole, GroupSettings, MembershipStatus };
