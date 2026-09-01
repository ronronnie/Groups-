import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "@/server/db/schema/auth";
import { jsonArray, jsonObject, timestamps } from "@/server/db/schema/shared";

const profileVisibilities = ["private", "groups", "public"] as const;
const remotePreferences = ["remote", "hybrid", "onsite", "flexible"] as const;

type ProfileVisibility = (typeof profileVisibilities)[number];
type RemotePreference = (typeof remotePreferences)[number];
type ProfilePrivacySettings = {
  showCurrentCompany: boolean;
  showLocation: boolean;
  showSkills: boolean;
};

export const profiles = pgTable(
  "profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    headline: text("headline").notNull().default(""),
    currentRole: text("current_role").notNull().default(""),
    currentCompany: text("current_company"),
    yearsExperience: integer("years_experience").notNull().default(0),
    location: text("location").notNull().default(""),
    skills: jsonArray<string>("skills"),
    profileCompleteness: integer("profile_completeness").notNull().default(0),
    visibility: text("visibility")
      .$type<ProfileVisibility>()
      .notNull()
      .default("groups"),
    privacySettings: jsonObject<ProfilePrivacySettings>("privacy_settings"),
    ...timestamps(),
  },
  (table) => [
    check(
      "profiles_years_experience_check",
      sql`${table.yearsExperience} between 0 and 80`,
    ),
    check(
      "profiles_completeness_check",
      sql`${table.profileCompleteness} between 0 and 100`,
    ),
    check(
      "profiles_visibility_check",
      sql`${table.visibility} in ('private', 'groups', 'public')`,
    ),
    index("profiles_location_idx").on(table.location),
  ],
);

export const profilePreferences = pgTable(
  "profile_preferences",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    desiredRoles: jsonArray<string>("desired_roles"),
    preferredLocations: jsonArray<string>("preferred_locations"),
    remotePreference: text("remote_preference")
      .$type<RemotePreference>()
      .notNull()
      .default("flexible"),
    minimumSalary: text("minimum_salary"),
    ...timestamps(),
  },
  (table) => [
    check(
      "profile_preferences_remote_check",
      sql`${table.remotePreference} in ('remote', 'hybrid', 'onsite', 'flexible')`,
    ),
  ],
);

export { profileVisibilities, remotePreferences };
export type { ProfilePrivacySettings, ProfileVisibility, RemotePreference };
