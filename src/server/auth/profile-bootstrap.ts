import { sql, type SQL } from "drizzle-orm";
import { profiles } from "@/server/db/schema/profiles";

export type ProfileBootstrapUser = {
  id: string;
  name: string;
};

type ExecuteSql = (query: SQL) => Promise<unknown>;

export async function bootstrapUserProfile(
  execute: ExecuteSql,
  user: ProfileBootstrapUser,
) {
  const displayName = user.name.trim();
  const userIdColumn = sql.identifier("user_id");
  const displayNameColumn = sql.identifier("display_name");
  const privacySettingsColumn = sql.identifier("privacy_settings");

  await execute(sql`
    insert into ${profiles} (
      ${userIdColumn},
      ${displayNameColumn},
      ${privacySettingsColumn}
    )
    values (
      ${user.id},
      ${displayName},
      ${JSON.stringify({
        showCurrentCompany: false,
        showLocation: false,
        showSkills: true,
        showYearsExperience: true,
      })}::jsonb
    )
    on conflict (${userIdColumn}) do nothing
  `);
}
