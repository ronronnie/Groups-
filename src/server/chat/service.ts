import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import {
  ChatModerationError,
  generalChatMessageSchema,
  moderateGeneralChatMessage,
  type ChatModerationHook,
} from "@/domains/chat/policy";

export type ChatSqlExecutor = <Row extends Record<string, unknown>>(
  query: SQL,
) => Promise<{ rows: Row[] }>;

export type GeneralChatMessage = {
  id: string;
  body: string;
  authorId: string | null;
  authorName: string;
  createdAt: Date;
};

type GeneralChatMessageRow = Omit<GeneralChatMessage, "createdAt"> & {
  createdAt: Date | string;
};

const accessInputSchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
});

function toMessage(row: GeneralChatMessageRow): GeneralChatMessage {
  return {
    ...row,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
  };
}

export async function canAccessGeneralChat(
  execute: ChatSqlExecutor,
  input: { groupId: string; userId: string },
) {
  const values = accessInputSchema.parse(input);
  const result = await execute<{ allowed: boolean }>(sql`
    select true as allowed
    from group_memberships
    where group_id = ${values.groupId}
      and user_id = ${values.userId}
      and status = 'active'
    limit 1
  `);

  return Boolean(result.rows[0]?.allowed);
}

export async function listGeneralChatMessages(
  execute: ChatSqlExecutor,
  input: { groupId: string; viewerId: string },
): Promise<GeneralChatMessage[] | null> {
  const values = z
    .object({
      groupId: z.string().uuid(),
      viewerId: z.string().uuid(),
    })
    .parse(input);

  if (
    !(await canAccessGeneralChat(execute, {
      groupId: values.groupId,
      userId: values.viewerId,
    }))
  ) {
    return null;
  }

  const result = await execute<GeneralChatMessageRow>(sql`
    select *
    from (
      select
        message.id,
        message.body,
        message.author_id as "authorId",
        coalesce(author.name, 'Former member') as "authorName",
        message.created_at as "createdAt"
      from message_threads thread
      inner join messages message
        on message.thread_id = thread.id
        and message.group_id = thread.group_id
      left join users author on author.id = message.author_id
      where thread.group_id = ${values.groupId}
        and thread.kind = 'general'
        and message.deleted_at is null
      order by message.created_at desc, message.id desc
      limit 100
    ) recent_messages
    order by "createdAt" asc, id asc
  `);

  return result.rows.map(toMessage);
}

export async function createGeneralChatMessage(
  execute: ChatSqlExecutor,
  input: { groupId: string; authorId: string; body: string },
  moderate: ChatModerationHook = moderateGeneralChatMessage,
): Promise<GeneralChatMessage | null> {
  const values = z
    .object({
      groupId: z.string().uuid(),
      authorId: z.string().uuid(),
      body: generalChatMessageSchema,
    })
    .parse(input);
  const moderation = await moderate(values.body);

  if (moderation.decision === "block") {
    throw new ChatModerationError(moderation.message, moderation.flags);
  }

  const result = await execute<GeneralChatMessageRow>(sql`
    with authorized_group as materialized (
      select membership.group_id
      from group_memberships membership
      where membership.group_id = ${values.groupId}
        and membership.user_id = ${values.authorId}
        and membership.status = 'active'
      limit 1
    ),
    saved_thread as (
      insert into message_threads (
        group_id,
        kind,
        title,
        created_by_user_id
      )
      select
        authorized_group.group_id,
        'general',
        'General chat',
        ${values.authorId}
      from authorized_group
      on conflict (group_id) where kind = 'general' do update
      set updated_at = now()
      returning id, group_id
    ),
    saved_message as (
      insert into messages (group_id, thread_id, author_id, body)
      select
        saved_thread.group_id,
        saved_thread.id,
        ${values.authorId},
        ${values.body}
      from saved_thread
      returning id, body, author_id, created_at
    )
    select
      saved_message.id,
      saved_message.body,
      saved_message.author_id as "authorId",
      author.name as "authorName",
      saved_message.created_at as "createdAt"
    from saved_message
    inner join users author on author.id = saved_message.author_id
  `);

  return result.rows[0] ? toMessage(result.rows[0]) : null;
}
