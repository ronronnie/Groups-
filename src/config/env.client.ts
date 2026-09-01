"use client";

import { validateClientEnv } from "@/config/env";

export function getClientEnv() {
  return validateClientEnv({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
}
