import { createHash, randomBytes } from "node:crypto";
import { inviteTokenSchema } from "@/domains/groups/validation";

export function generateInviteToken() {
  return randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string) {
  const validToken = inviteTokenSchema.parse(token);
  return createHash("sha256").update(validToken).digest("hex");
}
