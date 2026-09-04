import { sql, type SQL } from "drizzle-orm";

export function groupProfileDetailsAllowedSql(groupId: SQL) {
  return sql`exists (select 1 from groups privacy_group
    where privacy_group.id = ${groupId}
      and coalesce(privacy_group.settings ->> 'defaultProfileVisibility', 'members') = 'members')`;
}
