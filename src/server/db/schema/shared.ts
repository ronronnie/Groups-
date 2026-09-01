import { sql } from "drizzle-orm";
import { jsonb, timestamp } from "drizzle-orm/pg-core";

type JsonObject = Record<string, unknown>;

function timestamps() {
  return {
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  };
}

function jsonObject<T extends JsonObject>(name: string) {
  return jsonb(name)
    .$type<T>()
    .default(sql`'{}'::jsonb`)
    .notNull();
}

function jsonArray<T>(name: string) {
  return jsonb(name)
    .$type<T[]>()
    .default(sql`'[]'::jsonb`)
    .notNull();
}

export { jsonArray, jsonObject, timestamps };
export type { JsonObject };
