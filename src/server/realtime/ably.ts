import * as Ably from "ably";
import { getServerEnv } from "@/config/env.server";

export function createAblyRestClient(key = getServerEnv().ABLY_API_KEY) {
  return new Ably.Rest({ key });
}
