import "server-only";

import { validateServerEnv } from "@/config/env";

export function getServerEnv() {
  return validateServerEnv(process.env);
}
