import "server-only";

import { validateAuthEnv, validateServerEnv } from "@/config/env";

export function getServerEnv() {
  return validateServerEnv(process.env);
}

export function getAuthEnv() {
  return validateAuthEnv(process.env);
}
