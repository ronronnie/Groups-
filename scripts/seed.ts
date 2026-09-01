import { config } from "dotenv";

config({ path: ".env", quiet: true });
config({ path: ".env.local", override: true, quiet: true });

const { validateDatabaseEnv } = await import("@/config/env");
const { seedDatabase } = await import("@/server/db/seed");

const env = validateDatabaseEnv(process.env);
const result = await seedDatabase(env.DATABASE_URL);

console.info(
  `Seeded ${result.people} fictional people, ${result.groups} group, and ${result.jobs} jobs.`,
);
