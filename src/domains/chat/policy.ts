import { z } from "zod";

export const generalChatMessageSchema = z
  .string()
  .trim()
  .min(1, "Write a message before sending.")
  .max(2000, "Keep chat messages under 2,000 characters.");

export function getGeneralChatRoomName(groupId: string) {
  return `groups:${z.string().uuid().parse(groupId)}:general`;
}

export type ChatModerationResult =
  | { decision: "allow"; flags: [] }
  | { decision: "block"; flags: string[]; message: string };

export type ChatModerationHook = (
  body: string,
) => ChatModerationResult | Promise<ChatModerationResult>;

export function moderateGeneralChatMessage(body: string): ChatModerationResult {
  const links = body.match(/https?:\/\/\S+/gi) ?? [];
  const hasRepeatedCharacterSpam = /(.)\1{19,}/u.test(body);

  if (links.length > 5 || hasRepeatedCharacterSpam) {
    return {
      decision: "block",
      flags: [
        ...(links.length > 5 ? ["excessive-links"] : []),
        ...(hasRepeatedCharacterSpam ? ["repeated-character-spam"] : []),
      ],
      message: "This message looks like spam. Edit it and try again.",
    };
  }

  return { decision: "allow", flags: [] };
}

export class ChatModerationError extends Error {
  readonly status = 422;

  constructor(
    message: string,
    readonly flags: string[],
  ) {
    super(message);
    this.name = "ChatModerationError";
  }
}
