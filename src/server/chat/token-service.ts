import type * as Ably from "ably";
import { z } from "zod";
import { getGeneralChatRoomName } from "@/domains/chat/policy";
import {
  canAccessGeneralChat,
  type ChatSqlExecutor,
} from "@/server/chat/service";

export type ChatTokenIssuer = (
  params: Ably.TokenParams,
) => Promise<Ably.TokenRequest>;

const tokenInputSchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
});

export async function issueGeneralChatToken(
  execute: ChatSqlExecutor,
  issueToken: ChatTokenIssuer,
  input: { groupId: string; userId: string },
) {
  const values = tokenInputSchema.parse(input);
  const allowed = await canAccessGeneralChat(execute, values);

  if (!allowed) return null;

  const roomName = getGeneralChatRoomName(values.groupId);
  return issueToken({
    capability: { [roomName]: ["publish", "subscribe"] },
    clientId: values.userId,
    ttl: 60 * 60 * 1000,
  });
}
