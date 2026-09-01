import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getServerEnv } from "@/config/env.server";
import * as schema from "@/server/db/schema";

export function createDatabase(databaseUrl = getServerEnv().DATABASE_URL) {
  const sql = neon(databaseUrl);

  return drizzle(sql, { schema });
}
