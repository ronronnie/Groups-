import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { validateDatabaseEnv } from "@/config/env";
import * as schema from "@/server/db/schema";

export function createDatabase(
  databaseUrl = validateDatabaseEnv(process.env).DATABASE_URL,
) {
  const sql = neon(databaseUrl);

  return drizzle({ client: sql, schema });
}
