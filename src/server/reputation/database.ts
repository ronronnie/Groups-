import "server-only";

import type { SQL } from "drizzle-orm";
import { createDatabase } from "@/server/db/client";
import type { ReputationSqlExecutor } from "@/server/reputation/service";

export function createReputationSqlExecutor(): ReputationSqlExecutor {
  const database = createDatabase();

  return async <Row extends Record<string, unknown>>(query: SQL) => {
    const result = await database.execute(query);
    return { rows: result.rows as Row[] };
  };
}
