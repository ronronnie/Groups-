import { createHash } from "node:crypto";
import { sql, type SQL } from "drizzle-orm";
import { groupProfileDetailsAllowedSql } from "@/server/groups/privacy";
import { z } from "zod";
import type {
  AskGroupSource,
  AskGroupSourceKind,
} from "@/domains/search/ask-group";

const MAX_INDEXED_SOURCES = 240;
const MAX_SOURCE_CONTENT_LENGTH = 4_000;
const idSchema = z.string().uuid();

export type SearchSqlExecutor = <Row extends Record<string, unknown>>(
  query: SQL,
) => Promise<{ rows: Row[] }>;

export type KnowledgeSource = {
  key: string;
  kind: AskGroupSourceKind;
  sourceId: string;
  title: string;
  content: string;
  href: string;
};

type KnowledgeSourceRow = KnowledgeSource & {
  sourceKind: AskGroupSourceKind;
};

type IndexedDocument = {
  sourceKey: string;
  contentHash: string;
  modelAlias: string;
};

export type SourceEmbedding = {
  source: KnowledgeSource;
  embedding: number[];
  contentHash: string;
};

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_SOURCE_CONTENT_LENGTH);
}

function mapSource(row: KnowledgeSourceRow): KnowledgeSource {
  return {
    key: row.key,
    kind: row.sourceKind,
    sourceId: row.sourceId,
    title: compactText(row.title),
    content: compactText(row.content),
    href: row.href,
  };
}

export function hashKnowledgeSource(source: KnowledgeSource) {
  return createHash("sha256")
    .update(`${source.title}\n${source.content}\n${source.href}`)
    .digest("hex");
}

export async function isActiveGroupMember(
  execute: SearchSqlExecutor,
  input: { groupId: string; groupSlug: string; userId: string },
) {
  const groupId = idSchema.parse(input.groupId);
  const userId = idSchema.parse(input.userId);
  const groupSlug = z.string().trim().min(1).max(80).parse(input.groupSlug);
  const result = await execute<{ allowed: boolean }>(sql`
    select true as allowed
    from group_memberships membership
    inner join groups "group" on "group".id = membership.group_id
    where membership.group_id = ${groupId}
      and membership.user_id = ${userId}
      and membership.status = 'active'
      and "group".slug = ${groupSlug}
    limit 1
  `);

  return Boolean(result.rows[0]?.allowed);
}

export async function listAuthorizedKnowledgeSources(
  execute: SearchSqlExecutor,
  input: { groupId: string; groupSlug: string; viewerId: string },
): Promise<KnowledgeSource[]> {
  const groupId = idSchema.parse(input.groupId);
  const viewerId = idSchema.parse(input.viewerId);
  const groupSlug = z.string().min(1).max(80).parse(input.groupSlug);
  const result = await execute<KnowledgeSourceRow>(sql`
    with authorized_group as materialized (
      select group_id
      from group_memberships
      where group_id = ${groupId}
        and user_id = ${viewerId}
        and status = 'active'
      limit 1
    ), knowledge as (
      select
        'job:' || job.id::text as key,
        'job'::text as "sourceKind",
        job.id as "sourceId",
        job.title || ' at ' || job.company as title,
        concat_ws(' ',
          job.title,
          job.company,
          nullif(job.description_summary, ''),
          nullif(job.description_text, ''),
          nullif(job.location, ''),
          job.work_mode,
          job.employment_type,
          case when job.experience_min is not null
            then job.experience_min::text || ' years minimum experience' else null end,
          case when job.experience_max is not null
            then job.experience_max::text || ' years maximum experience' else null end,
          case when job.posted_at is not null
            then 'posted ' || job.posted_at::date::text else null end,
          job.status,
          array_to_string(array(select jsonb_array_elements_text(job.skills)), ', ')
        ) as content,
        '/app/groups/' || ${groupSlug} || '/jobs/' || job.id::text as href,
        job.updated_at as "sourceUpdatedAt"
      from jobs job
      inner join active_job_shares share on share.job_id = job.id
      inner join authorized_group access on access.group_id = share.group_id
      where share.group_id = ${groupId}
      group by job.id

      union all

      select
        'job-share:' || share.id::text,
        'job_share'::text,
        share.id,
        'Shared ' || job.title || ' at ' || job.company,
        concat_ws(' ', sharer.name, 'shared', job.title, 'at', job.company, share.note),
        '/app/groups/' || ${groupSlug} || '/jobs/' || job.id::text,
        share.shared_at
      from active_job_shares share
      inner join authorized_group access on access.group_id = share.group_id
      inner join jobs job on job.id = share.job_id
      inner join users sharer on sharer.id = share.sharer_id
      where share.group_id = ${groupId}

      union all

      select
        'discussion:' || message.id::text,
        'discussion'::text,
        message.id,
        job.title || ' discussion',
        concat_ws(' ', coalesce(author.name, 'Former member'), message.body),
        '/app/groups/' || ${groupSlug} || '/jobs/' || job.id::text || '#discussion',
        coalesce(message.edited_at, message.created_at)
      from message_threads thread
      inner join authorized_group access on access.group_id = thread.group_id
      inner join messages message
        on message.thread_id = thread.id
        and message.group_id = thread.group_id
      inner join jobs job on job.id = thread.job_id
      left join users author on author.id = message.author_id
      where thread.group_id = ${groupId}
        and thread.kind = 'job'
        and exists (select 1 from active_job_shares share where share.group_id = thread.group_id and share.job_id = thread.job_id)
        and message.deleted_at is null

      union all

      select
        'profile:' || profile.user_id::text,
        'profile'::text,
        profile.user_id,
        profile.display_name,
        concat_ws(' ',
          profile.display_name,
          nullif(profile.headline, ''),
          nullif(profile.current_role, ''),
          case when coalesce((profile.privacy_settings ->> 'showCurrentCompany')::boolean, false)
            then profile.current_company else null end,
          case when coalesce((profile.privacy_settings ->> 'showLocation')::boolean, false)
            then nullif(profile.location, '') else null end,
          case when coalesce((profile.privacy_settings ->> 'showSkills')::boolean, false)
            then array_to_string(array(select jsonb_array_elements_text(profile.skills)), ', ') else null end,
          case when coalesce((profile.privacy_settings ->> 'showYearsExperience')::boolean, false)
            then profile.years_experience::text || ' years experience' else null end
        ),
        '/app/groups/' || ${groupSlug} || '/people/' || profile.user_id::text,
        profile.updated_at
      from profiles profile
      inner join group_memberships member on member.user_id = profile.user_id
      inner join authorized_group access on access.group_id = member.group_id
      where member.group_id = ${groupId}
        and member.status = 'active'
        and profile.visibility in ('groups', 'public')
        and ${groupProfileDetailsAllowedSql(sql`member.group_id`)}

      union all

      select
        'outcome:' || outcome.id::text,
        'outcome'::text,
        outcome.id,
        subject.name || ': ' || outcome.outcome_type || ' at ' || job.company,
        concat_ws(' ', subject.name, outcome.outcome_type, job.title, job.company),
        '/app/groups/' || ${groupSlug} || '/jobs/' || job.id::text,
        outcome.updated_at
      from outcomes outcome
      inner join authorized_group access on access.group_id = outcome.group_id
      inner join jobs job on job.id = outcome.job_id
      inner join users subject on subject.id = outcome.subject_user_id
      where outcome.group_id = ${groupId}
        and outcome.visibility = 'group'
        and outcome.consent_granted_at is not null
        and outcome.shared_at is not null

      union all

      select
        'reputation:' || summary.user_id::text,
        'reputation'::text,
        summary.user_id,
        member.name || ' contributions',
        concat_ws(' ',
          member.name,
          summary.jobs_shared::text || ' jobs shared',
          summary.jobs_saved_by_members::text || ' jobs saved by members',
          summary.referrals_completed::text || ' referrals completed',
          summary.interviews_helped::text || ' interviews helped',
          summary.hires_helped::text || ' hires helped'
        ),
        '/app/groups/' || ${groupSlug} || '/people/' || summary.user_id::text,
        summary.calculated_at
      from user_reputation_summaries summary
      inner join authorized_group access on access.group_id = summary.group_id
      inner join users member on member.id = summary.user_id
      inner join group_memberships membership
        on membership.group_id = summary.group_id
        and membership.user_id = summary.user_id
        and membership.status = 'active'
      where summary.group_id = ${groupId}
    )
    select key, "sourceKind", "sourceId", title, content, href
    from knowledge
    where length(trim(content)) > 0
    order by "sourceUpdatedAt" desc, key
    limit ${MAX_INDEXED_SOURCES}
  `);

  return result.rows.map(mapSource);
}

export async function listViewerSavedJobSources(
  execute: SearchSqlExecutor,
  input: { groupId: string; groupSlug: string; viewerId: string },
): Promise<KnowledgeSource[]> {
  const groupId = idSchema.parse(input.groupId);
  const viewerId = idSchema.parse(input.viewerId);
  const groupSlug = z.string().min(1).max(80).parse(input.groupSlug);
  const result = await execute<KnowledgeSourceRow>(sql`
    select distinct on (job.id)
      'job:' || job.id::text as key,
      'job'::text as "sourceKind",
      job.id as "sourceId",
      job.title || ' at ' || job.company as title,
      concat_ws(' ', 'Saved by you and not yet applied to.', job.title, job.company, job.location) as content,
      '/app/groups/' || ${groupSlug} || '/jobs/' || job.id::text as href
    from user_job_states state
    inner join jobs job on job.id = state.job_id
    inner join active_job_shares share
      on share.job_id = job.id
      and share.group_id = ${groupId}
    inner join group_memberships viewer
      on viewer.group_id = share.group_id
      and viewer.user_id = ${viewerId}
      and viewer.status = 'active'
    left join applications application
      on application.user_id = ${viewerId}
      and application.job_id = job.id
      and application.source_group_id = ${groupId}
      and application.archived_at is null
    where state.user_id = ${viewerId}
      and state.saved = true
      and (application.id is null or application.status = 'saved')
    order by job.id, state.saved_at desc nulls last
    limit 30
  `);

  return result.rows.map(mapSource);
}

export async function listIndexedDocuments(
  execute: SearchSqlExecutor,
  groupId: string,
) {
  const result = await execute<IndexedDocument>(sql`
    select
      source_key as "sourceKey",
      content_hash as "contentHash",
      model_alias as "modelAlias"
    from group_knowledge_documents
    where group_id = ${idSchema.parse(groupId)}
  `);
  return result.rows;
}

export async function deleteIndexedDocuments(
  execute: SearchSqlExecutor,
  groupId: string,
  sourceKeys: string[],
) {
  if (!sourceKeys.length) return;
  const keys = sql.join(
    sourceKeys.map((key) => sql`${key}`),
    sql`, `,
  );
  await execute(sql`
    delete from group_knowledge_documents
    where group_id = ${idSchema.parse(groupId)}
      and source_key in (${keys})
  `);
}

export async function pruneIndexedDocuments(
  execute: SearchSqlExecutor,
  groupId: string,
  currentSourceKeys: string[],
) {
  const parsedGroupId = idSchema.parse(groupId);
  if (!currentSourceKeys.length) {
    await execute(sql`
      delete from group_knowledge_documents where group_id = ${parsedGroupId}
    `);
    return;
  }
  const keys = sql.join(
    currentSourceKeys.map((key) => sql`${key}`),
    sql`, `,
  );
  await execute(sql`
    delete from group_knowledge_documents
    where group_id = ${parsedGroupId}
      and source_key not in (${keys})
  `);
}

export async function upsertIndexedDocument(
  execute: SearchSqlExecutor,
  input: SourceEmbedding & { groupId: string; modelAlias: string },
) {
  await execute(sql`
    insert into group_knowledge_documents (
      group_id,
      source_key,
      source_kind,
      source_id,
      title,
      content,
      href,
      embedding,
      model_alias,
      content_hash
    ) values (
      ${idSchema.parse(input.groupId)},
      ${input.source.key},
      ${input.source.kind},
      ${idSchema.parse(input.source.sourceId)},
      ${input.source.title},
      ${input.source.content},
      ${input.source.href},
      ${JSON.stringify(input.embedding)}::vector,
      ${input.modelAlias},
      ${input.contentHash}
    )
    on conflict (group_id, source_key) do update
    set
      source_kind = excluded.source_kind,
      source_id = excluded.source_id,
      title = excluded.title,
      content = excluded.content,
      href = excluded.href,
      embedding = excluded.embedding,
      model_alias = excluded.model_alias,
      content_hash = excluded.content_hash,
      updated_at = now()
  `);
}

export async function searchIndexedKnowledge(
  execute: SearchSqlExecutor,
  input: {
    groupId: string;
    viewerId: string;
    embedding: number[];
    limit?: number;
  },
): Promise<AskGroupSource[]> {
  const groupId = idSchema.parse(input.groupId);
  const viewerId = idSchema.parse(input.viewerId);
  const limit = z
    .number()
    .int()
    .min(1)
    .max(12)
    .parse(input.limit ?? 6);
  const result = await execute<{
    key: string;
    kind: AskGroupSourceKind;
    title: string;
    excerpt: string;
    href: string;
    score: number | string;
  }>(sql`
    select
      document.source_key as key,
      document.source_kind as kind,
      document.title,
      left(document.content, 500) as excerpt,
      document.href,
      1 - (document.embedding <=> ${JSON.stringify(input.embedding)}::vector) as score
    from group_knowledge_documents document
    inner join group_memberships viewer
      on viewer.group_id = document.group_id
      and viewer.user_id = ${viewerId}
      and viewer.status = 'active'
    where document.group_id = ${groupId}
      and case document.source_kind
        when 'job' then exists (select 1 from active_job_shares share where share.group_id = document.group_id and share.job_id = document.source_id)
        when 'job_share' then exists (select 1 from active_job_shares share where share.group_id = document.group_id and share.id = document.source_id)
        when 'discussion' then exists (select 1 from messages message inner join message_threads thread on thread.id = message.thread_id
          inner join active_job_shares share on share.group_id = thread.group_id and share.job_id = thread.job_id
          where message.id = document.source_id and message.group_id = document.group_id and message.deleted_at is null)
        when 'profile' then ${groupProfileDetailsAllowedSql(sql`document.group_id`)} and exists (
          select 1 from profiles profile inner join group_memberships member on member.user_id = profile.user_id
          where member.group_id = document.group_id and member.user_id = document.source_id and member.status = 'active'
            and profile.visibility in ('groups', 'public'))
        when 'reputation' then exists (select 1 from group_memberships member where member.group_id = document.group_id
          and member.user_id = document.source_id and member.status = 'active')
        else true
      end
    order by document.embedding <=> ${JSON.stringify(input.embedding)}::vector
    limit ${limit}
  `);

  return result.rows.map((row) => ({
    ...row,
    score: Math.max(0, Math.min(1, Number(row.score))),
  }));
}

export function rankKnowledgeLexically(
  question: string,
  sources: KnowledgeSource[],
  limit = 6,
): AskGroupSource[] {
  const terms = [
    ...new Set(
      question
        .toLocaleLowerCase()
        .split(/[^a-z0-9+#.]+/)
        .filter((term) => term.length > 2),
    ),
  ];

  return sources
    .map((source) => {
      const title = source.title.toLocaleLowerCase();
      const content = source.content.toLocaleLowerCase();
      const matches = terms.reduce(
        (score, term) =>
          score +
          (title.includes(term) ? 3 : 0) +
          (content.includes(term) ? 1 : 0),
        0,
      );
      return { source, matches };
    })
    .filter(({ matches }) => matches > 0)
    .sort(
      (a, b) =>
        b.matches - a.matches || a.source.key.localeCompare(b.source.key),
    )
    .slice(0, limit)
    .map(({ source, matches }) => ({
      key: source.key,
      kind: source.kind,
      title: source.title,
      excerpt: source.content.slice(0, 500),
      href: source.href,
      score: Math.min(1, matches / Math.max(4, terms.length * 3)),
    }));
}
