// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  listOutcomes,
  recordPrivateOutcome,
  setOutcomeVisibility,
  type OutcomeSqlExecutor,
} from "@/server/outcomes/service";
import {
  recalculateReputationSummary,
  recordReputationEvent,
} from "@/server/reputation/service";
import { getGroupMemberOverview } from "@/server/people/service";

const id = (n: number) =>
  `a1000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const subject = id(1),
  sharer = id(2),
  referrer = id(3),
  outsider = id(4);
const groupId = id(10),
  otherGroup = id(11),
  jobId = id(20),
  applicationId = id(30),
  requestId = id(40);
const input = {
  groupId,
  applicationId,
  userId: subject,
  outcomeType: "interview" as const,
  confirmed: true as const,
  creditSharer: true,
  creditReferrer: true,
};

describe("outcomes and consent", () => {
  let client: PGlite;
  let execute: OutcomeSqlExecutor;
  beforeAll(async () => {
    client = await PGlite.create({ extensions: { vector } });
    for (const file of readdirSync("drizzle")
      .filter((file) => file.endsWith(".sql"))
      .sort()) {
      await client.exec(readFileSync(path.join("drizzle", file), "utf8"));
    }
    const database = drizzle(client);
    execute = async <Row extends Record<string, unknown>>(
      query: Parameters<typeof database.execute>[0],
    ) => {
      const result = await database.execute(query);
      return { rows: result.rows as Row[] };
    };
  }, 30_000);
  beforeEach(async () => {
    await client.exec("truncate users, jobs cascade");
    await client.query(
      `insert into users (id, name, email) values
      ($1, 'Candidate', 'candidate@example.test'), ($2, 'Sharer', 'sharer@example.test'),
      ($3, 'Referrer', 'referrer@example.test'), ($4, 'Outsider', 'outsider@example.test')`,
      [subject, sharer, referrer, outsider],
    );
    await client.query(
      `insert into groups (id, name, slug, engine_key, owner_id) values
      ($1, 'First', 'first', 'jobs', $3), ($2, 'Other', 'other', 'jobs', $4)`,
      [groupId, otherGroup, sharer, outsider],
    );
    await client.query(
      `insert into group_memberships (group_id, user_id, role, status) values
      ($1, $3, 'member', 'active'), ($1, $4, 'owner', 'active'), ($1, $5, 'member', 'active'), ($2, $6, 'owner', 'active')`,
      [groupId, otherGroup, subject, sharer, referrer, outsider],
    );
    await client.query(
      `insert into jobs (id, canonical_url, company, title, source) values
      ($1, 'https://example.test/job', 'Example Co', 'Engineer', 'test')`,
      [jobId],
    );
    await client.query(
      `insert into job_shares (group_id, job_id, sharer_id, shared_at)
      values ($1, $2, $3, now() - interval '2 days')`,
      [groupId, jobId, sharer],
    );
    await client.query(
      `insert into applications (id, user_id, job_id, source_group_id, status, private_notes)
      values ($1, $2, $3, $4, 'interviewing', 'SECRET SALARY NOTES')`,
      [applicationId, subject, jobId, groupId],
    );
    await client.query(
      `insert into referral_requests (id, requester_id, potential_referrer_id, job_id, group_id, message, state, completed_at)
      values ($1, $2, $3, $4, $5, 'SECRET REFERRAL MESSAGE', 'referred', now())`,
      [requestId, subject, referrer, jobId, groupId],
    );
    await client.query(
      `insert into referral_request_state_events (request_id, to_state, changed_by_user_id)
      values ($1, 'referred', $2)`,
      [requestId, referrer],
    );
  });
  afterAll(async () => {
    await client.close();
  });

  const create = async () => {
    const result = await recordPrivateOutcome(execute, input);
    expect(result).not.toBeNull();
    return result!.id;
  };
  const share = (outcomeId: string) =>
    setOutcomeVisibility(execute, {
      groupId,
      userId: subject,
      outcomeId,
      visibility: "group",
      consent: true,
    });

  it("creates only private records, without announcements or credit", async () => {
    await create();
    const mine = await listOutcomes(execute, {
      groupId,
      userId: subject,
      scope: "mine",
    });
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({
      visibility: "private",
      sharerName: "Sharer",
      referrerName: "Referrer",
    });
    expect(JSON.stringify(mine)).not.toContain("SECRET");
    expect(
      (await client.query("select * from reputation_events")).rows,
    ).toHaveLength(0);
    expect(
      (await client.query("select * from activity_events")).rows,
    ).toHaveLength(0);
    expect(
      (await client.query("select * from notifications")).rows,
    ).toHaveLength(0);
  });

  it("requires explicit confirmation and explicit sharing consent", async () => {
    await expect(
      recordPrivateOutcome(execute, { ...input, confirmed: false as never }),
    ).rejects.toThrow();
    const outcomeId = await create();
    await expect(
      setOutcomeVisibility(execute, {
        groupId,
        userId: subject,
        outcomeId,
        visibility: "group",
        consent: false as never,
      }),
    ).rejects.toThrow();
    expect(
      (
        await listOutcomes(execute, { groupId, userId: subject, scope: "mine" })
      )[0]?.visibility,
    ).toBe("private");
  });

  it("authorizes ownership and active membership, not admin privilege", async () => {
    for (const userId of [sharer, outsider]) {
      expect(
        await recordPrivateOutcome(execute, { ...input, userId }),
      ).toBeNull();
    }
    expect(
      await recordPrivateOutcome(execute, { ...input, groupId: otherGroup }),
    ).toBeNull();
    const outcomeId = await create();
    for (const userId of [sharer, referrer, outsider]) {
      expect(
        await setOutcomeVisibility(execute, {
          groupId,
          userId,
          outcomeId,
          visibility: "group",
          consent: true,
        }),
      ).toBeNull();
      expect(
        await listOutcomes(execute, { groupId, userId, scope: "mine" }),
      ).toEqual([]);
      expect(
        await listOutcomes(execute, { groupId, userId, scope: "group" }),
      ).toEqual([]);
    }
    expect(
      await setOutcomeVisibility(execute, {
        groupId: otherGroup,
        userId: subject,
        outcomeId,
        visibility: "group",
        consent: true,
      }),
    ).toBeNull();
    await client.query(
      "update group_memberships set status = 'left' where user_id = $1",
      [subject],
    );
    expect(await share(outcomeId)).toBeNull();
    expect(await recordPrivateOutcome(execute, input)).toBeNull();
  });

  it("requires a matching tracker milestone, including past history", async () => {
    expect(
      await recordPrivateOutcome(execute, { ...input, outcomeType: "hired" }),
    ).toBeNull();
    await client.query(
      "update applications set status = 'rejected' where id = $1",
      [applicationId],
    );
    expect(await recordPrivateOutcome(execute, input)).toBeNull();
    await client.query(
      `insert into application_status_events (application_id, to_status, changed_by_user_id)
      values ($1, 'interviewing', $2)`,
      [applicationId, subject],
    );
    await create();
  });

  it("deduplicates the same milestone even across concurrent requests", async () => {
    const results = await Promise.all([
      recordPrivateOutcome(execute, input),
      recordPrivateOutcome(execute, input),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect((await client.query("select * from outcomes")).rows).toHaveLength(1);
  });

  it("credits only real, non-self source links and referrer-confirmed referrals", async () => {
    await client.query("update job_shares set sharer_id = $1", [subject]);
    await client.query(
      "update referral_request_state_events set changed_by_user_id = $1",
      [subject],
    );
    await create();
    expect(
      (
        await listOutcomes(execute, { groupId, userId: subject, scope: "mine" })
      )[0],
    ).toMatchObject({ sharerName: null, referrerName: null });
  });

  it("rejects late sharer credit and supports choosing no attribution", async () => {
    await client.query(
      "update job_shares set shared_at = now() + interval '1 day'",
    );
    const result = await recordPrivateOutcome(execute, {
      ...input,
      creditReferrer: false,
    });
    expect(result).not.toBeNull();
    expect(
      (
        await listOutcomes(execute, { groupId, userId: subject, scope: "mine" })
      )[0],
    ).toMatchObject({ sharerName: null, referrerName: null });
  });

  it("shares only within the chosen group and credits each helper exactly once", async () => {
    const outcomeId = await create();
    await share(outcomeId);
    await share(outcomeId);
    expect(
      await listOutcomes(execute, { groupId, userId: sharer, scope: "group" }),
    ).toHaveLength(1);
    expect(
      await listOutcomes(execute, {
        groupId,
        userId: outsider,
        scope: "group",
      }),
    ).toEqual([]);
    expect(
      await listOutcomes(execute, {
        groupId: otherGroup,
        userId: outsider,
        scope: "group",
      }),
    ).toEqual([]);
    expect(
      (await client.query("select * from reputation_events")).rows,
    ).toHaveLength(2);
    for (const userId of [sharer, referrer]) {
      expect(
        await recalculateReputationSummary(execute, { groupId, userId }),
      ).toMatchObject({ totalPoints: 4, interviewsHelped: 1 });
    }
    expect(
      (await client.query("select * from notifications")).rows,
    ).toHaveLength(0);
  });

  it("does not double-credit someone who both shared and referred", async () => {
    await client.query(
      "update referral_requests set potential_referrer_id = $1",
      [sharer],
    );
    await client.query(
      "update referral_request_state_events set changed_by_user_id = $1",
      [sharer],
    );
    const outcomeId = await create();
    await share(outcomeId);
    expect(
      (await client.query("select * from reputation_events")).rows,
    ).toHaveLength(1);
    expect(
      await recalculateReputationSummary(execute, { groupId, userId: sharer }),
    ).toMatchObject({ totalPoints: 4 });
  });

  it("rechecks source attribution before awarding reputation", async () => {
    const outcomeId = await create();
    await client.exec(
      "delete from job_shares; delete from referral_request_state_events",
    );
    await share(outcomeId);
    expect(
      (await client.query("select * from reputation_events")).rows,
    ).toHaveLength(0);
  });

  it("withdraws visibility and credit atomically and does not duplicate credit on resharing", async () => {
    const outcomeId = await create();
    await share(outcomeId);
    await client.query(
      `insert into group_knowledge_documents
      (group_id, source_key, source_kind, source_id, title, content, href, embedding, model_alias, content_hash)
      values ($1, $2, 'outcome', $3, 'Private again', 'Must disappear', '/outcomes', $4, 'test', 'hash')`,
      [
        groupId,
        `outcome:${outcomeId}`,
        outcomeId,
        JSON.stringify(Array(1536).fill(0)),
      ],
    );
    const withdraw = {
      groupId,
      userId: subject,
      outcomeId,
      visibility: "private" as const,
    };
    await setOutcomeVisibility(execute, withdraw);
    await setOutcomeVisibility(execute, withdraw);
    expect(
      await listOutcomes(execute, { groupId, userId: sharer, scope: "group" }),
    ).toEqual([]);
    expect(
      (await client.query("select * from group_knowledge_documents")).rows,
    ).toHaveLength(0);
    expect(
      (await client.query("select * from reputation_events")).rows,
    ).toHaveLength(2);
    expect(
      (await client.query("select total_points from user_reputation_summaries"))
        .rows,
    ).toEqual([{ total_points: 0 }, { total_points: 0 }]);
    expect(
      await recalculateReputationSummary(execute, { groupId, userId: sharer }),
    ).toMatchObject({ totalPoints: 0, interviewsHelped: 0 });
    expect(
      (
        await getGroupMemberOverview(execute, {
          groupId,
          viewerId: subject,
          memberId: sharer,
        })
      )?.contributions,
    ).toEqual([]);
    expect(
      await recordReputationEvent(execute, {
        groupId,
        actorUserId: subject,
        recipientUserId: sharer,
        eventType: "interview_helped",
        sourceEntityId: outcomeId,
      }),
    ).toBeNull();
    await share(outcomeId);
    expect(
      (await client.query("select * from reputation_events")).rows,
    ).toHaveLength(2);
    expect(
      (await client.query("select total_points from user_reputation_summaries"))
        .rows,
    ).toEqual([{ total_points: 4 }, { total_points: 4 }]);
  });

  it("rebuilds missing caches on withdrawal without losing unrelated credit", async () => {
    const shares = await client.query<{ id: string }>(
      "select id from job_shares",
    );
    await recordReputationEvent(execute, {
      groupId,
      recipientUserId: sharer,
      actorUserId: null,
      eventType: "job_shared",
      sourceEntityId: shares.rows[0]!.id,
    });
    const outcomeId = await create();
    await share(outcomeId);
    await client.exec("delete from user_reputation_summaries");
    await setOutcomeVisibility(execute, {
      groupId,
      userId: subject,
      outcomeId,
      visibility: "private",
    });
    const summary = await client.query(
      "select total_points, jobs_shared, interviews_helped from user_reputation_summaries where user_id = $1",
      [sharer],
    );
    expect(summary.rows).toEqual([
      { total_points: 1, jobs_shared: 1, interviews_helped: 0 },
    ]);
    await share(outcomeId);
    const restored = await client.query(
      "select total_points, jobs_shared, interviews_helped from user_reputation_summaries where user_id = $1",
      [sharer],
    );
    expect(restored.rows).toEqual([
      { total_points: 5, jobs_shared: 1, interviews_helped: 1 },
    ]);
  });

  it("records offers without inventing a new reputation category, and awards hire credit", async () => {
    await client.query("update applications set status = 'offer'");
    const offer = await recordPrivateOutcome(execute, {
      ...input,
      outcomeType: "offer",
    });
    await share(offer!.id);
    expect(
      (await client.query("select * from reputation_events")).rows,
    ).toHaveLength(0);
    await client.query("update applications set status = 'hired'");
    const hired = await recordPrivateOutcome(execute, {
      ...input,
      outcomeType: "hired",
    });
    await share(hired!.id);
    expect(
      await recalculateReputationSummary(execute, { groupId, userId: sharer }),
    ).toMatchObject({ totalPoints: 10, hiresHelped: 1 });
  });
});
