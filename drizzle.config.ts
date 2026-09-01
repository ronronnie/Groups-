import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env", quiet: true });
config({ path: ".env.local", override: true, quiet: true });

const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./src/server/db/schema.ts",
  strict: true,
  verbose: true,
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
});
