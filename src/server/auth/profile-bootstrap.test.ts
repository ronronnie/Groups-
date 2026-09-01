// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bootstrapUserProfile } from "@/server/auth/profile-bootstrap";

const userId = "10000000-0000-4000-8000-000000000099";

function readMigrations() {
  const directory = path.resolve(process.cwd(), "drizzle");
  return readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(path.join(directory, file), "utf8"));
}

describe("profile bootstrap", () => {
  let client: PGlite;

  beforeAll(async () => {
    client = await PGlite.create({ extensions: { vector } });
    for (const migration of readMigrations()) {
      await client.exec(migration);
    }
    await client.query(
      `insert into users (id, name, email, email_verified)
       values ($1, '  Casey Demo  ', 'casey@example.test', false)`,
      [userId],
    );
  }, 30_000);

  afterAll(async () => {
    await client.close();
  });

  it("creates one conservative profile after signup", async () => {
    const database = drizzle(client);
    const execute = async (query: Parameters<typeof database.execute>[0]) => {
      await database.execute(query);
    };

    await bootstrapUserProfile(execute, {
      id: userId,
      name: "  Casey Demo  ",
    });
    await bootstrapUserProfile(execute, {
      id: userId,
      name: "Casey Changed",
    });

    const result = await client.query<{
      count: number;
      display_name: string;
      visibility: string;
      privacy_settings: {
        showCurrentCompany: boolean;
        showLocation: boolean;
        showSkills: boolean;
        showYearsExperience: boolean;
      };
    }>(
      `select count(*) over ()::int as count,
              display_name,
              visibility,
              privacy_settings
       from profiles
       where user_id = $1`,
      [userId],
    );

    expect(result.rows[0]).toEqual({
      count: 1,
      display_name: "Casey Demo",
      visibility: "groups",
      privacy_settings: {
        showCurrentCompany: false,
        showLocation: false,
        showSkills: true,
        showYearsExperience: true,
      },
    });
  });
});
