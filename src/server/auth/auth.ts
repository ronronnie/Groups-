import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { APP_NAME } from "@/config/brand";
import { getAuthEnv } from "@/config/env.server";
import { passwordSchema } from "@/domains/auth/validation";
import { createDatabase } from "@/server/db/client";
import * as schema from "@/server/db/schema";
import {
  bootstrapUserProfile,
  type ProfileBootstrapUser,
} from "@/server/auth/profile-bootstrap";

export const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;
export const SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24;

function buildAuth() {
  const env = getAuthEnv();
  const database = createDatabase(env.DATABASE_URL);

  return betterAuth({
    appName: APP_NAME,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.NEXT_PUBLIC_APP_URL],
    database: drizzleAdapter(database, {
      provider: "pg",
      schema,
      usePlural: true,
    }),
    advanced: {
      database: {
        generateId: "uuid",
      },
      useSecureCookies: process.env.NODE_ENV === "production",
    },
    session: {
      expiresIn: SESSION_EXPIRES_IN_SECONDS,
      updateAge: SESSION_UPDATE_AGE_SECONDS,
      freshAge: 60 * 60,
    },
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    hooks: {
      before: createAuthMiddleware(async (context) => {
        if (context.path !== "/sign-up/email") {
          return;
        }

        const result = passwordSchema.safeParse(context.body?.password);
        if (!result.success) {
          throw new APIError("BAD_REQUEST", {
            message: result.error.issues[0]?.message ?? "Password is invalid.",
          });
        }
      }),
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => ({
            data: {
              ...user,
              email: user.email.trim().toLowerCase(),
              name: user.name.trim(),
            },
          }),
          after: async (user) => {
            await bootstrapUserProfile(
              (query) => database.execute(query),
              user as ProfileBootstrapUser,
            );
          },
        },
      },
    },
    // Server actions need this last so Better Auth can forward Set-Cookie headers.
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof buildAuth>;

let authInstance: Auth | undefined;

export function getAuth(): Auth {
  authInstance ??= buildAuth();
  return authInstance;
}
