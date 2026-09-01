import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import {
  calculateProfileCompleteness,
  careerProfileInputSchema,
  profilePrivacySettingsSchema,
  type CareerProfileInput,
  type ProfilePrivacySettings,
  type ProfileVisibility,
  type RemotePreference,
} from "@/domains/profiles/career-profile";

export type ProfileSqlExecutor = <Row extends Record<string, unknown>>(
  query: SQL,
) => Promise<{ rows: Row[] }>;

export type OwnerCareerProfile = {
  userId: string;
  displayName: string;
  headline: string;
  currentRole: string;
  currentCompany: string | null;
  yearsExperience: number;
  location: string;
  skills: string[];
  portfolioUrl: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  desiredRoles: string[];
  preferredLocations: string[];
  remotePreference: RemotePreference;
  resumeUrl: string | null;
  privateNotes: string | null;
  visibility: ProfileVisibility;
  privacySettings: ProfilePrivacySettings;
  completeness: number;
};

export type PublicCareerProfile = {
  userId: string;
  displayName: string;
  headline: string;
  currentRole: string;
  currentCompany: string | null;
  yearsExperience: number | null;
  location: string | null;
  skills: string[];
  portfolioUrl: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  completeness: number;
};

const userIdSchema = z.string().uuid();
const defaultPrivacySettings: ProfilePrivacySettings = {
  showCurrentCompany: false,
  showLocation: false,
  showSkills: true,
  showYearsExperience: true,
};

function normalizePrivacySettings(value: unknown) {
  const merged =
    typeof value === "object" && value !== null
      ? { ...defaultPrivacySettings, ...value }
      : defaultPrivacySettings;
  const result = profilePrivacySettingsSchema.safeParse(merged);
  return result.success ? result.data : defaultPrivacySettings;
}

export async function getOwnerCareerProfile(
  execute: ProfileSqlExecutor,
  userId: string,
): Promise<OwnerCareerProfile | null> {
  const validUserId = userIdSchema.parse(userId);
  const result = await execute<
    Omit<OwnerCareerProfile, "privacySettings"> & {
      privacySettings: unknown;
    }
  >(sql`
    select
      p.user_id as "userId",
      p.display_name as "displayName",
      p.headline,
      p.current_role as "currentRole",
      p.current_company as "currentCompany",
      p.years_experience as "yearsExperience",
      p.location,
      p.skills,
      p.portfolio_url as "portfolioUrl",
      p.linkedin_url as "linkedinUrl",
      p.website_url as "websiteUrl",
      coalesce(pp.desired_roles, '[]'::jsonb) as "desiredRoles",
      coalesce(pp.preferred_locations, '[]'::jsonb) as "preferredLocations",
      coalesce(pp.remote_preference, 'flexible') as "remotePreference",
      pp.resume_url as "resumeUrl",
      pp.private_notes as "privateNotes",
      p.visibility,
      p.privacy_settings as "privacySettings",
      p.profile_completeness as completeness
    from profiles p
    left join profile_preferences pp on pp.user_id = p.user_id
    where p.user_id = ${validUserId}
    limit 1
  `);
  const row = result.rows[0];

  return row
    ? { ...row, privacySettings: normalizePrivacySettings(row.privacySettings) }
    : null;
}

export async function saveCareerProfile(
  execute: ProfileSqlExecutor,
  userId: string,
  input: CareerProfileInput,
) {
  const validUserId = userIdSchema.parse(userId);
  const profile = careerProfileInputSchema.parse(input);
  const completeness = calculateProfileCompleteness(profile);
  const skills = JSON.stringify(profile.skills);
  const desiredRoles = JSON.stringify(profile.desiredRoles);
  const preferredLocations = JSON.stringify(profile.preferredLocations);
  const privacySettings = JSON.stringify(profile.privacySettings);

  const result = await execute<{ userId: string }>(sql`
    with saved_profile as (
      insert into profiles (
        user_id,
        display_name,
        headline,
        "current_role",
        current_company,
        years_experience,
        location,
        skills,
        portfolio_url,
        linkedin_url,
        website_url,
        profile_completeness,
        visibility,
        privacy_settings
      )
      values (
        ${validUserId},
        ${profile.displayName},
        ${profile.headline},
        ${profile.currentRole},
        ${profile.currentCompany},
        ${profile.yearsExperience},
        ${profile.location},
        ${skills}::jsonb,
        ${profile.portfolioUrl},
        ${profile.linkedinUrl},
        ${profile.websiteUrl},
        ${completeness},
        ${profile.visibility},
        ${privacySettings}::jsonb
      )
      on conflict (user_id) do update
      set
        display_name = excluded.display_name,
        headline = excluded.headline,
        "current_role" = excluded."current_role",
        current_company = excluded.current_company,
        years_experience = excluded.years_experience,
        location = excluded.location,
        skills = excluded.skills,
        portfolio_url = excluded.portfolio_url,
        linkedin_url = excluded.linkedin_url,
        website_url = excluded.website_url,
        profile_completeness = excluded.profile_completeness,
        visibility = excluded.visibility,
        privacy_settings = excluded.privacy_settings,
        updated_at = now()
      returning user_id
    ),
    saved_preferences as (
      insert into profile_preferences (
        user_id,
        desired_roles,
        preferred_locations,
        remote_preference,
        resume_url,
        private_notes
      )
      select
        user_id,
        ${desiredRoles}::jsonb,
        ${preferredLocations}::jsonb,
        ${profile.remotePreference},
        ${profile.resumeUrl},
        ${profile.privateNotes}
      from saved_profile
      on conflict (user_id) do update
      set
        desired_roles = excluded.desired_roles,
        preferred_locations = excluded.preferred_locations,
        remote_preference = excluded.remote_preference,
        resume_url = excluded.resume_url,
        private_notes = excluded.private_notes,
        updated_at = now()
      returning user_id
    )
    select user_id as "userId" from saved_preferences
  `);

  if (!result.rows[0]) {
    throw new Error("The career profile could not be saved.");
  }

  return { completeness };
}

export async function getVisibleCareerProfile(
  execute: ProfileSqlExecutor,
  input: {
    viewerUserId: string;
    subjectUserId: string;
    groupId?: string;
  },
): Promise<PublicCareerProfile | null> {
  const ids = z
    .object({
      viewerUserId: userIdSchema,
      subjectUserId: userIdSchema,
      groupId: z.string().uuid().optional(),
    })
    .parse(input);
  const sharedGroupAccess = ids.groupId
    ? sql`exists (
        select 1
        from group_memberships viewer_membership
        inner join group_memberships subject_membership
          on subject_membership.group_id = viewer_membership.group_id
          and subject_membership.user_id = ${ids.subjectUserId}
          and subject_membership.status = 'active'
        where viewer_membership.group_id = ${ids.groupId}
          and viewer_membership.user_id = ${ids.viewerUserId}
          and viewer_membership.status = 'active'
      )`
    : sql`false`;
  const result = await execute<{
    userId: string;
    displayName: string;
    headline: string;
    currentRole: string;
    currentCompany: string | null;
    yearsExperience: number;
    location: string;
    skills: string[];
    portfolioUrl: string | null;
    linkedinUrl: string | null;
    websiteUrl: string | null;
    completeness: number;
    privacySettings: unknown;
    isOwner: boolean;
  }>(sql`
    select
      p.user_id as "userId",
      p.display_name as "displayName",
      p.headline,
      p.current_role as "currentRole",
      p.current_company as "currentCompany",
      p.years_experience as "yearsExperience",
      p.location,
      p.skills,
      p.portfolio_url as "portfolioUrl",
      p.linkedin_url as "linkedinUrl",
      p.website_url as "websiteUrl",
      p.profile_completeness as completeness,
      p.privacy_settings as "privacySettings",
      p.user_id = ${ids.viewerUserId} as "isOwner"
    from profiles p
    where p.user_id = ${ids.subjectUserId}
      and (
        p.user_id = ${ids.viewerUserId}
        or p.visibility = 'public'
        or (p.visibility = 'groups' and ${sharedGroupAccess})
      )
    limit 1
  `);
  const row = result.rows[0];

  if (!row) {
    return null;
  }

  const privacy = normalizePrivacySettings(row.privacySettings);
  return {
    userId: row.userId,
    displayName: row.displayName,
    headline: row.headline,
    currentRole: row.currentRole,
    currentCompany:
      row.isOwner || privacy.showCurrentCompany ? row.currentCompany : null,
    yearsExperience:
      row.isOwner || privacy.showYearsExperience ? row.yearsExperience : null,
    location: row.isOwner || privacy.showLocation ? row.location : null,
    skills: row.isOwner || privacy.showSkills ? row.skills : [],
    portfolioUrl: row.portfolioUrl,
    linkedinUrl: row.linkedinUrl,
    websiteUrl: row.websiteUrl,
    completeness: row.completeness,
  };
}
