import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  validateAuthEnv,
  validateClientEnv,
  validateDatabaseEnv,
  validateServerEnv,
} from "@/config/env";

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

function parseEnvExample() {
  return Object.fromEntries(
    readFileSync(path.resolve(process.cwd(), ".env.example"), "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        return [
          line.slice(0, separator),
          line.slice(separator + 1).replace(/^"|"$/g, ""),
        ];
      }),
  );
}

describe("environment validation", () => {
  it("validates server configuration without exposing secrets as public env", () => {
    expect(validateServerEnv(validEnv)).toEqual(validEnv);
  });

  it("validates the public client configuration separately", () => {
    expect(validateClientEnv(validEnv)).toEqual({
      NEXT_PUBLIC_APP_URL: validEnv.NEXT_PUBLIC_APP_URL,
    });
  });

  it("validates database tooling without requiring unrelated secrets", () => {
    expect(
      validateDatabaseEnv({ DATABASE_URL: "postgresql://localhost/groups" }),
    ).toEqual({ DATABASE_URL: "postgresql://localhost/groups" });
  });

  it("validates auth configuration without requiring unrelated integrations", () => {
    expect(validateAuthEnv(validEnv)).toEqual({
      DATABASE_URL: validEnv.DATABASE_URL,
      BETTER_AUTH_SECRET: validEnv.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: validEnv.BETTER_AUTH_URL,
      GOOGLE_CLIENT_ID: validEnv.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: validEnv.GOOGLE_CLIENT_SECRET,
      NEXT_PUBLIC_APP_URL: validEnv.NEXT_PUBLIC_APP_URL,
    });
  });

  it("keeps the environment template complete and placeholder-only", () => {
    const example = parseEnvExample();

    expect(Object.keys(example).sort()).toEqual(Object.keys(validEnv).sort());
    expect(example).toMatchObject({
      DATABASE_URL: expect.stringContaining(
        "user:password@host-pooler.neon.tech",
      ),
      BETTER_AUTH_SECRET: expect.stringContaining("replace-with"),
      GOOGLE_CLIENT_ID: expect.stringContaining("replace-with"),
      GOOGLE_CLIENT_SECRET: expect.stringContaining("replace-with"),
      OPENAI_API_KEY: expect.stringContaining("replace-with"),
      ABLY_API_KEY: expect.stringContaining("replace-with"),
    });
  });
});
