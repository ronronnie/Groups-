import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

export const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
});

export const authEnvSchema = clientEnvSchema.merge(databaseEnvSchema).extend({
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: nonEmptyString,
  GOOGLE_CLIENT_SECRET: nonEmptyString,
});

export const serverEnvSchema = authEnvSchema.extend({
  OPENAI_API_KEY: nonEmptyString,
  OPENAI_MODEL: nonEmptyString,
  OPENAI_EMBEDDING_MODEL: nonEmptyString,
  ABLY_API_KEY: nonEmptyString,
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
export type AuthEnv = z.infer<typeof authEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
type RawEnv = Record<string, string | undefined>;

export function validateClientEnv(env: RawEnv): ClientEnv {
  return clientEnvSchema.parse({
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
  });
}

export function validateServerEnv(env: RawEnv): ServerEnv {
  return serverEnvSchema.parse({
    DATABASE_URL: env.DATABASE_URL,
    BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: env.BETTER_AUTH_URL,
    GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    OPENAI_MODEL: env.OPENAI_MODEL,
    OPENAI_EMBEDDING_MODEL: env.OPENAI_EMBEDDING_MODEL,
    ABLY_API_KEY: env.ABLY_API_KEY,
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
  });
}

export function validateAuthEnv(env: RawEnv): AuthEnv {
  return authEnvSchema.parse({
    DATABASE_URL: env.DATABASE_URL,
    BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: env.BETTER_AUTH_URL,
    GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
  });
}

export function validateDatabaseEnv(env: RawEnv): DatabaseEnv {
  return databaseEnvSchema.parse({
    DATABASE_URL: env.DATABASE_URL,
  });
}
