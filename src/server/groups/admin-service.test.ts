// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  groupSettingsSchema,
  updateGroupSettingsSchema,
} from "@/domains/groups/admin";
import {
  changeMemberRole,
  dismissContentReport,
  getAdminGroup,
  getModerationQueue,
  moderateGroupContent,
  removeGroupMember,
  reportGroupContent,
  updateGroupSettings,
} from "@/server/groups/admin-service";
import {
  acceptGroupInvite,
  createGroupInvite,
  createGroupWithInvite,
  getInvitePreview,
  listManagedInvites,
  revokeGroupInvite,
  type GroupSqlExecutor,
} from "@/server/groups/service";
import {
  createGeneralChatMessage,
  listGeneralChatMessages,
} from "@/server/chat/service";
import { getGroupJobDetail } from "@/server/jobs/detail-service";
import { shareJob } from "@/server/jobs/service";
import {
  listAuthorizedKnowledgeSources,
  searchIndexedKnowledge,
} from "@/server/search/retrieval";
import { getForYouFeed } from "@/server/jobs/feed-service";
import { listGroupPeople } from "@/server/people/service";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/server/notifications/service";
import { defaultNotificationPreferences } from "@/domains/notifications/events";

const owner = "10000000-0000-4000-8000-000000000001";
const admin = "10000000-0000-4000-8000-000000000002";
const member = "10000000-0000-4000-8000-000000000003";
const outsider = "10000000-0000-4000-8000-000000000004";
const defaults = groupSettingsSchema.parse({});
describe("group administration", () => {
  let client: PGlite;
  let execute: GroupSqlExecutor;
  let groupId: string;
  let otherGroupId: string;
  let token: string;
  beforeAll(async () => {
    client = await PGlite.create({ extensions: { vector } });
    for (const file of readdirSync("drizzle")
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await client.exec(readFileSync(`drizzle/${file}`, "utf8"));
    const db = drizzle(client);
    execute = async (query) => ({
      rows: (await db.execute(query)).rows as never[],
    });
  }, 30000);
  afterAll(async () => {
    await client.close();
  });
  beforeEach(async () => {
    await client.exec("truncate users, jobs cascade");
    for (const [id, name] of [
      [owner, "Owner"],
      [admin, "Admin"],
      [member, "Member"],
      [outsider, "Outsider"],
    ])
      await client.query(
        "insert into users (id,name,email) values ($1,$2,$3)",
        [id, name, `${name}@example.test`],
      );
    const group = await createGroupWithInvite(execute, {
      name: "Jobs team",
      engineKey: "jobs",
      ownerId: owner,
    });
    groupId = group.groupId;
    token = group.token;
    await acceptGroupInvite(execute, { token, userId: admin });
    await acceptGroupInvite(execute, { token, userId: member });
    await changeMemberRole(execute, {
      groupId,
      userId: owner,
      memberId: admin,
      role: "admin",
    });
    otherGroupId = (
      await createGroupWithInvite(execute, {
        name: "Other team",
        engineKey: "jobs",
        ownerId: outsider,
      })
    ).groupId;
  });
  it("limits settings to active group admins and keeps engine and ownership immutable", async () => {
    expect(
      await getAdminGroup(execute, { groupId, userId: member }),
    ).toBeNull();
    expect(
      await updateGroupSettings(
        execute,
        { groupId, name: "Changed name", settings: defaults },
        outsider,
      ),
    ).toBeNull();
    expect(
      await updateGroupSettings(
        execute,
        { groupId, name: "Changed name", settings: defaults },
        admin,
      ),
    ).not.toBeNull();
    expect(
      updateGroupSettingsSchema.safeParse({
        groupId,
        name: "Changed name",
        settings: defaults,
        engineKey: "chat",
      }).success,
    ).toBe(false);
    const result = await client.query(
      "select engine_key, owner_id from groups where id = $1",
      [groupId],
    );
    expect(result.rows[0]).toEqual({ engine_key: "jobs", owner_id: owner });
  });
  it("only lets owners change other non-owner roles", async () => {
    for (const [userId, memberId] of [
      [admin, member],
      [member, admin],
      [owner, owner],
      [outsider, member],
    ])
      expect(
        await changeMemberRole(execute, {
          groupId,
          userId,
          memberId,
          role: "admin",
        }),
      ).toBeNull();
    expect(
      await changeMemberRole(execute, {
        groupId,
        userId: owner,
        memberId: member,
        role: "admin",
      }),
    ).not.toBeNull();
    expect(
      await changeMemberRole(execute, {
        groupId,
        userId: owner,
        memberId: member,
        role: "member",
      }),
    ).not.toBeNull();
  });
  it("protects owner and self, and blocks removed members from old invites and chat", async () => {
    for (const [userId, memberId] of [
      [admin, owner],
      [owner, owner],
      [admin, admin],
      [member, admin],
      [outsider, member],
    ])
      expect(
        await removeGroupMember(execute, { groupId, userId, memberId }),
      ).toBeNull();
    const invite = await createGroupInvite(execute, {
      groupId,
      inviterId: admin,
      expiresAt: new Date(Date.now() + 86400000),
      maxUses: null,
    });
    expect(
      await removeGroupMember(execute, {
        groupId,
        userId: owner,
        memberId: admin,
      }),
    ).not.toBeNull();
    expect(await getInvitePreview(execute, invite!.token)).toMatchObject({
      status: "revoked",
    });
    expect(
      await acceptGroupInvite(execute, { token, userId: admin }),
    ).toBeNull();
    expect(
      await listGeneralChatMessages(execute, { groupId, viewerId: admin }),
    ).toBeNull();
    expect(
      await createGeneralChatMessage(execute, {
        groupId,
        authorId: admin,
        body: "Denied",
      }),
    ).toBeNull();
    expect(
      await removeGroupMember(execute, {
        groupId,
        userId: owner,
        memberId: admin,
      }),
    ).toBeNull();
  });
  it("allows admins to remove members, but not peers", async () => {
    await changeMemberRole(execute, {
      groupId,
      userId: owner,
      memberId: member,
      role: "admin",
    });
    expect(
      await removeGroupMember(execute, {
        groupId,
        userId: admin,
        memberId: member,
      }),
    ).toBeNull();
    await changeMemberRole(execute, {
      groupId,
      userId: owner,
      memberId: member,
      role: "member",
    });
    expect(
      await removeGroupMember(execute, {
        groupId,
        userId: admin,
        memberId: member,
      }),
    ).not.toBeNull();
  });
  it("enforces member invite policy, ownership, pause and revocation", async () => {
    const input = {
      groupId,
      inviterId: member,
      expiresAt: new Date(Date.now() + 86400000),
      maxUses: null,
    };
    expect(await createGroupInvite(execute, input)).toBeNull();
    await updateGroupSettings(
      execute,
      {
        groupId,
        name: "Jobs team",
        settings: { ...defaults, allowMemberInvites: true },
      },
      owner,
    );
    const invite = await createGroupInvite(execute, input);
    expect(invite).not.toBeNull();
    expect(
      (await listManagedInvites(execute, groupId, member))?.map((i) => i.id),
    ).toEqual([invite!.id]);
    expect(
      await revokeGroupInvite(execute, {
        groupId,
        inviteId: invite!.id,
        userId: outsider,
      }),
    ).toBe(false);
    await updateGroupSettings(
      execute,
      {
        groupId,
        name: "Jobs team",
        settings: { ...defaults, invitesEnabled: false },
      },
      owner,
    );
    expect(
      await createGroupInvite(execute, { ...input, inviterId: owner }),
    ).toBeNull();
    expect(await getInvitePreview(execute, token)).toMatchObject({
      status: "paused",
    });
    expect(
      await acceptGroupInvite(execute, { token, userId: outsider }),
    ).toBeNull();
    expect(
      await revokeGroupInvite(execute, {
        groupId,
        inviteId: invite!.id,
        userId: member,
      }),
    ).toBe(true);
  });
  it("validates report targets and lets admins hide/restore without deleting messages", async () => {
    const message = await createGeneralChatMessage(execute, {
      groupId,
      authorId: member,
      body: "Off topic message",
    });
    const target = {
      groupId,
      targetType: "message" as const,
      targetId: message!.id,
    };
    const report = {
      ...target,
      userId: member,
      reason: "off_topic" as const,
      details: "Unrelated to jobs",
    };
    expect(
      await reportGroupContent(execute, { ...report, userId: outsider }),
    ).toBeNull();
    expect(
      await reportGroupContent(execute, {
        ...report,
        groupId: otherGroupId,
        userId: outsider,
      }),
    ).toBeNull();
    const submitted = await reportGroupContent(execute, report);
    expect(await reportGroupContent(execute, report)).toEqual(submitted);
    expect(
      (await getModerationQueue(execute, { groupId, userId: member })).content,
    ).toEqual([]);
    expect(
      (await getModerationQueue(execute, { groupId, userId: admin })).reports,
    ).toHaveLength(1);
    expect(
      await moderateGroupContent(execute, {
        ...target,
        userId: member,
        hidden: true,
        reason: "Off topic",
      }),
    ).toBeNull();
    expect(
      await moderateGroupContent(execute, {
        ...target,
        groupId: otherGroupId,
        userId: outsider,
        hidden: true,
        reason: "Off topic",
      }),
    ).toBeNull();
    expect(
      await moderateGroupContent(execute, {
        ...target,
        userId: admin,
        hidden: true,
        reason: "Off topic",
      }),
    ).not.toBeNull();
    expect(
      await listGeneralChatMessages(execute, { groupId, viewerId: member }),
    ).toEqual([]);
    expect(
      (await getModerationQueue(execute, { groupId, userId: admin })).reports,
    ).toEqual([]);
    expect(
      await moderateGroupContent(execute, {
        ...target,
        userId: admin,
        hidden: false,
        reason: "Reviewed appeal",
      }),
    ).not.toBeNull();
    expect(
      await listGeneralChatMessages(execute, { groupId, viewerId: member }),
    ).toHaveLength(1);
    const audits = await client.query<{ action: string }>(
      "select action from group_admin_events where target_id=$1 order by created_at",
      [message!.id],
    );
    expect(audits.rows.map((r) => r.action)).toEqual([
      "message_hidden",
      "message_restored",
    ]);
  });
  it("dismisses reports without hiding content", async () => {
    const message = await createGeneralChatMessage(execute, {
      groupId,
      authorId: member,
      body: "Useful message",
    });
    const report = await reportGroupContent(execute, {
      groupId,
      targetType: "message",
      targetId: message!.id,
      userId: member,
      reason: "other",
      details: "Review",
    });
    expect(
      await dismissContentReport(execute, {
        groupId,
        reportId: report!.id,
        userId: member,
      }),
    ).toBeNull();
    expect(
      await dismissContentReport(execute, {
        groupId,
        reportId: report!.id,
        userId: admin,
      }),
    ).not.toBeNull();
    expect(
      await listGeneralChatMessages(execute, { groupId, viewerId: member }),
    ).toHaveLength(1);
  });
  it("archives only a group share, preserves canonical jobs and private trackers, and filters search", async () => {
    const jobInput = {
      url: "https://example.test/jobs/engineer",
      company: "Example",
      title: "Engineer",
      note: "A role",
    };
    const share = await shareJob(execute, {
      ...jobInput,
      groupId,
      sharerId: member,
    });
    await shareJob(execute, {
      ...jobInput,
      groupId: otherGroupId,
      sharerId: outsider,
    });
    await client.query(
      "insert into applications(user_id,job_id,source_group_id,private_notes) values($1,$2,$3,'Private notes')",
      [member, share!.jobId, groupId],
    );
    const target = {
      groupId,
      targetType: "job_share" as const,
      targetId: share!.shareId,
      userId: admin,
      reason: "Misleading share",
    };
    expect(
      await moderateGroupContent(execute, { ...target, hidden: true }),
    ).not.toBeNull();
    expect(
      await getGroupJobDetail(execute, {
        groupId,
        viewerId: member,
        jobId: share!.jobId,
      }),
    ).toBeNull();
    expect(
      await getGroupJobDetail(execute, {
        groupId: otherGroupId,
        viewerId: outsider,
        jobId: share!.jobId,
      }),
    ).not.toBeNull();
    const sources = await listAuthorizedKnowledgeSources(execute, {
      groupId,
      groupSlug: "jobs-team",
      viewerId: member,
    });
    expect(
      sources.some(
        (source) => source.kind === "job" || source.kind === "job_share",
      ),
    ).toBe(false);
    expect(
      (
        await getForYouFeed(execute, {
          groupId,
          viewerId: member,
          filter: "recommended",
        })
      )?.items,
    ).toEqual([]);
    const embedding = Array.from({ length: 1536 }, () => 0.1);
    await client.query(
      `insert into group_knowledge_documents
      (group_id,source_key,source_kind,source_id,title,content,href,embedding,model_alias,content_hash)
      values($1,'stale-share','job_share',$2,'Stale title','Stale content','/app',$3::vector,'test','stale')`,
      [groupId, share!.shareId, JSON.stringify(embedding)],
    );
    expect(
      await searchIndexedKnowledge(execute, {
        groupId,
        viewerId: member,
        embedding,
      }),
    ).toEqual([]);
    expect(
      await shareJob(execute, { ...jobInput, groupId, sharerId: member }),
    ).toBeNull();
    expect(
      (
        await client.query(
          "select private_notes from applications where user_id=$1",
          [member],
        )
      ).rows,
    ).toEqual([{ private_notes: "Private notes" }]);
    expect(
      await moderateGroupContent(execute, { ...target, hidden: false }),
    ).not.toBeNull();
    expect(
      await getGroupJobDetail(execute, {
        groupId,
        viewerId: member,
        jobId: share!.jobId,
      }),
    ).not.toBeNull();
  });
  it("restricts profile discovery without overriding private choices and respects notification overrides", async () => {
    await client.query(
      "insert into profiles(user_id,display_name,headline,visibility) values ($1,'Shared name','Engineer','groups')",
      [member],
    );
    const settings = {
      ...defaults,
      defaultProfileVisibility: "private" as const,
      jobNotificationsDefault: false,
      groupNotificationsDefault: false,
      digestCadenceDefault: "off" as const,
    };
    await updateGroupSettings(
      execute,
      { groupId, name: "Jobs team", settings },
      owner,
    );
    expect(
      (await listGroupPeople(execute, { groupId, viewerId: owner }))?.find(
        (p) => p.userId === member,
      ),
    ).toMatchObject({
      displayName: "Member",
      headline: null,
      profileVisible: false,
    });
    expect(
      (
        await listAuthorizedKnowledgeSources(execute, {
          groupId,
          groupSlug: "jobs-team",
          viewerId: owner,
        })
      ).some((s) => s.kind === "profile"),
    ).toBe(false);
    expect(
      await getNotificationPreferences(execute, member, groupId),
    ).toMatchObject({
      jobActivityEnabled: false,
      groupActivityEnabled: false,
      digestCadence: "off",
    });
    await updateNotificationPreferences(
      execute,
      member,
      defaultNotificationPreferences,
    );
    expect(await getNotificationPreferences(execute, member, groupId)).toEqual(
      defaultNotificationPreferences,
    );
    await client.query(
      "update profiles set visibility='private' where user_id=$1",
      [member],
    );
    await updateGroupSettings(
      execute,
      { groupId, name: "Jobs team", settings: defaults },
      owner,
    );
    expect(
      (await listGroupPeople(execute, { groupId, viewerId: owner }))?.find(
        (p) => p.userId === member,
      )?.profileVisible,
    ).toBe(false);
  });
});
