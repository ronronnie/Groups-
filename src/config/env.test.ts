import { describe, expect, it } from "vitest";
import { validateClientEnv, validateServerEnv } from "@/config/env";

const validEnv = {
  DATABASE_URL: "postgresql://user:password@example.neon.tech/groups",
  BETTER_AUTH_SECRET: "12345678901234567890123456789012",
  BETTER_AUTH_URL: "http://localhost:3000",
  GOOGLE_CLIENT_ID: "google-client-id",
  GOOGLE_CLIENT_SECRET: "google-client-secret",
  OPENAI_API_KEY: "openai-api-key",
  OPENAI_MODEL: "gpt-5-mini",
  OPENAI_EMBEDDING_MODEL: "text-embedding-3-small",
  ABLY_API_KEY: "ably-api-key",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
};

describe("environment validation", () => {
  it("validates server configuration without exposing secrets as public env", () => {
    expect(validateServerEnv(validEnv)).toEqual(validEnv);
  });

  it("validates the public client configuration separately", () => {
    expect(validateClientEnv(validEnv)).toEqual({
      NEXT_PUBLIC_APP_URL: validEnv.NEXT_PUBLIC_APP_URL,
    });
  });
});
