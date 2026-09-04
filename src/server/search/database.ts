import "server-only";

import type { SQL } from "drizzle-orm";
import { createDatabase } from "@/server/db/client";
import type { SearchSqlExecutor } from "@/server/search/retrieval";

export function createSearchSqlExecutor(): SearchSqlExecutor {
  const database = createDatabase();

  return async <Row extends Record<string, unknown>>(query: SQL) => {
    const result = await database.execute(query);
    return { rows: result.rows as Row[] };
  };
}
