import { sql } from "drizzle-orm";
import { z } from "zod";
import type { JobSqlExecutor } from "@/server/jobs/service";

export const discussionMessageSchema = z
  .string()
  .trim()
  .min(1, "Write a message before posting.")
  .max(2000, "Keep discussion messages under 2,000 characters.");

export type JobDiscussionMessage = {
  id: string;
  body: string;
  authorId: string | null;
  authorName: string;
  replyToId: string | null;
  createdAt: Date;
};

type DiscussionRow = Omit<JobDiscussionMessage, "createdAt"> & {
  createdAt: Date | string;
};

const idSchema = z.string().uuid();

function toMessage(row: DiscussionRow): JobDiscussionMessage {
  return {
    ...row,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
  };
}

async function canAccessJobDiscussion(
  execute: JobSqlExecutor,
  input: { groupId: string; jobId: string; userId: string },
) {
  const result = await execute<{ allowed: boolean }>(sql`
    select true as allowed
    from group_memberships membership
    where membership.group_id = ${input.groupId}
      and membership.user_id = ${input.userId}
      and membership.status = 'active'
      and exists (
        select 1
        from job_shares shares
        where shares.group_id = membership.group_id
          and shares.job_id = ${input.jobId}
      )
    limit 1
  `);

  return Boolean(result.rows[0]?.allowed);
}

export async function listJobDiscussion(
  execute: JobSqlExecutor,
  input: { groupId: string; jobId: string; viewerId: string },
): Promise<JobDiscussionMessage[] | null> {
  const ids = z
    .object({ groupId: idSchema, jobId: idSchema, viewerId: idSchema })
    .parse(input);
  const allowed = await canAccessJobDiscussion(execute, {
    groupId: ids.groupId,
    jobId: ids.jobId,
    userId: ids.viewerId,
  });
  if (!allowed) return null;

  const result = await execute<DiscussionRow>(sql`
    select
      message.id,
      message.body,
      message.author_id as "authorId",
      coalesce(author.name, 'Former member') as "authorName",
      message.reply_to_id as "replyToId",
      message.created_at as "createdAt"
    from message_threads thread
    inner join messages message
      on message.thread_id = thread.id
      and message.group_id = thread.group_id
    left join users author on author.id = message.author_id
    where thread.group_id = ${ids.groupId}
      and thread.job_id = ${ids.jobId}
      and thread.kind = 'job'
      and message.deleted_at is null
    order by message.created_at asc, message.id asc
  `);

  return result.rows.map(toMessage);
}

export async function createJobDiscussionMessage(
  execute: JobSqlExecutor,
  input: {
    groupId: string;
    jobId: string;
    authorId: string;
    body: string;
  },
): Promise<JobDiscussionMessage | null> {
  const ids = z
    .object({ groupId: idSchema, jobId: idSchema, authorId: idSchema })
    .parse(input);
  const body = discussionMessageSchema.parse(input.body);
  const result = await execute<DiscussionRow>(sql`
    with authorized_job as materialized (
      select jobs.id, jobs.title
      from jobs
      inner join job_shares shares on shares.job_id = jobs.id
      inner join group_memberships membership
        on membership.group_id = shares.group_id
        and membership.user_id = ${ids.authorId}
        and membership.status = 'active'
      where shares.group_id = ${ids.groupId}
        and shares.job_id = ${ids.jobId}
      limit 1
    ),
    saved_thread as (
      insert into message_threads (
        group_id,
        job_id,
        kind,
        title,
        created_by_user_id
      )
      select
        ${ids.groupId},
        authorized_job.id,
        'job',
        authorized_job.title || ' discussion',
        ${ids.authorId}
      from authorized_job
      on conflict (group_id, job_id) where kind = 'job' do update
      set updated_at = now()
      returning id, group_id
    ),
    saved_message as (
      insert into messages (group_id, thread_id, author_id, body)
      select
        saved_thread.group_id,
        saved_thread.id,
        ${ids.authorId},
        ${body}
      from saved_thread
      returning id, body, author_id, reply_to_id, created_at
    )
    select
      saved_message.id,
      saved_message.body,
      saved_message.author_id as "authorId",
      author.name as "authorName",
      saved_message.reply_to_id as "replyToId",
      saved_message.created_at as "createdAt"
    from saved_message
    inner join users author on author.id = saved_message.author_id
  `);

  return result.rows[0] ? toMessage(result.rows[0]) : null;
}
