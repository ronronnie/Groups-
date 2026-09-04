// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getRecipientGroupDigest } from "@/server/digests/service";
import {
  createClosingSoonNotifications,
  createDueFollowUpNotifications,
  emitActivityEvent,
  getNotificationPreferences,
  listNotifications,
  updateNotificationPreferences,
  type NotificationSqlExecutor,
} from "@/server/notifications/service";

const ids = {
  owner: "90000000-0000-4000-8000-000000000001",
  member: "90000000-0000-4000-8000-000000000002",
  outsider: "90000000-0000-4000-8000-000000000003",
  group: "90000000-0000-4000-8000-000000000101",
  job: "90000000-0000-4000-8000-000000000201",
  savedJob: "90000000-0000-4000-8000-000000000202",
  application: "90000000-0000-4000-8000-000000000301",
  memberApplication: "90000000-0000-4000-8000-000000000302",
  referral: "90000000-0000-4000-8000-000000000401",
};

function readMigrations() {
  const directory = path.resolve(process.cwd(), "drizzle");
  return readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(path.join(directory, file), "utf8"));
}

describe("notifications and recipient digests", () => {
  let client: PGlite;
  let execute: NotificationSqlExecutor;

  beforeAll(async () => {
    client = await PGlite.create({ extensions: { vector } });
    for (const migration of readMigrations()) await client.exec(migration);

    await client.query(
      `insert into users (id, name, email, email_verified)
       values ($1, 'Owner User', 'notification-owner@example.test', true),
              ($2, 'Member User', 'notification-member@example.test', true),
              ($3, 'Outside User', 'notification-outsider@example.test', true)`,
      [ids.owner, ids.member, ids.outsider],
    );
    await client.query(
      `insert into groups (id, name, slug, engine_key, owner_id)
       values ($1, 'Notification Jobs', 'notification-jobs', 'jobs', $2)`,
      [ids.group, ids.owner],
    );
    await client.query(
      `insert into group_memberships (group_id, user_id, role, status)
       values ($1, $2, 'owner', 'active'),
              ($1, $3, 'member', 'active')`,
      [ids.group, ids.owner, ids.member],
    );
    await client.query(
      `insert into profiles (
         user_id, display_name, "current_role", years_experience, location,
         skills, profile_completeness, visibility
       ) values
       ($1, 'Owner User', 'Product Designer', 6, 'Bengaluru',
        '["Figma","Research","Design systems"]', 100, 'private'),
       ($2, 'Member User', 'Engineer', 5, 'Remote',
        '["TypeScript"]', 80, 'groups')`,
      [ids.owner, ids.member],
    );
    await client.query(
      `insert into profile_preferences (
         user_id, desired_roles, preferred_locations, remote_preference,
         private_notes
       ) values
       ($1, '["Product Designer"]', '["Bengaluru"]', 'hybrid',
        'OWNER PRIVATE PREFERENCE'),
       ($2, '["Engineer"]', '["Remote"]', 'remote',
        'MEMBER PRIVATE PREFERENCE')`,
      [ids.owner, ids.member],
    );
    await client.query(
      `insert into jobs (
         id, canonical_url, company, title, description_summary, location,
         work_mode, employment_type, experience_min, experience_max, skills,
         source, status, posted_at
       ) values
       ($1, 'https://jobs.example.test/strong', 'Northstar',
        'Senior Product Designer', 'Design workflows.', 'Bengaluru', 'hybrid',
        'full_time', 4, 8, '["Figma","Research","Design systems"]',
        'test', 'active', '2026-09-03T08:00:00Z'),
       ($2, 'https://jobs.example.test/saved', 'Old Co',
        'Staff Product Designer', 'Lead design.', 'Remote', 'remote',
        'full_time', 5, 10, '["Figma"]', 'test', 'active',
        '2026-08-10T08:00:00Z')`,
      [ids.job, ids.savedJob],
    );
    await client.query(
      `insert into job_shares (group_id, job_id, sharer_id, shared_at)
       values ($1, $2, $3, '2026-09-03T09:00:00Z'),
              ($1, $4, $3, '2026-09-02T09:00:00Z')`,
      [ids.group, ids.job, ids.member, ids.savedJob],
    );
    await client.query(
      `insert into user_job_states (user_id, job_id, saved, saved_at)
       values ($1, $2, true, '2026-09-03T10:00:00Z'),
              ($3, $4, true, '2026-09-03T10:00:00Z')`,
      [ids.owner, ids.savedJob, ids.member, ids.job],
    );
    await client.query(
      `insert into applications (
         id, user_id, job_id, source_group_id, status, visibility,
         private_notes, next_action, next_action_date
       ) values
       ($1, $2, $3, $4, 'saved', 'private', 'OWNER PRIVATE NOTE',
        'OWNER PRIVATE NEXT ACTION', '2026-09-04'),
       ($5, $6, $7, $4, 'interviewing', 'private', 'MEMBER PRIVATE NOTE',
        'MEMBER PRIVATE NEXT ACTION', '2026-09-04')`,
      [
        ids.application,
        ids.owner,
        ids.savedJob,
        ids.group,
        ids.memberApplication,
        ids.member,
        ids.job,
      ],
    );
    await client.query(
      `insert into referral_requests (
         id, requester_id, potential_referrer_id, job_id, group_id, message
       ) values ($1, $2, $3, $4, $5, 'PRIVATE REFERRAL MESSAGE')`,
      [ids.referral, ids.member, ids.owner, ids.job, ids.group],
    );

    const database = drizzle(client);
    execute = async <Row extends Record<string, unknown>>(
      query: Parameters<typeof database.execute>[0],
    ) => {
      const result = await database.execute(query);
      return { rows: result.rows as Row[] };
    };
  }, 30_000);

  beforeEach(async () => {
    await client.exec(
      "delete from notifications; delete from activity_events; delete from notification_preferences;",
    );
  });

  afterAll(async () => {
    await client.close();
  });

  it("creates an idempotent canonical event and routes only to active members", async () => {
    const event = {
      groupId: ids.group,
      actorUserId: ids.owner,
      recipientUserId: null,
      eventType: "invite_accepted" as const,
      entityType: "group_membership",
      entityId: null,
      visibility: "group" as const,
      category: "group_activity" as const,
      recipientIds: [ids.member, ids.outsider],
      title: "Invite accepted",
      body: "A member joined the group.",
      actionUrl: "/app/groups/notification-jobs/people",
      dedupeKey: "test:invite:accepted",
      summary: "A member joined the group.",
    };

    await expect(emitActivityEvent(execute, event)).resolves.toMatchObject({
      notificationCount: 1,
    });
    await expect(emitActivityEvent(execute, event)).resolves.toMatchObject({
      notificationCount: 0,
    });

    const activity = await client.query<{ count: number }>(
      "select count(*)::int as count from activity_events",
    );
    const routed = await client.query<{ userId: string }>(
      'select user_id as "userId" from notifications',
    );
    expect(activity.rows[0]?.count).toBe(1);
    expect(routed.rows).toEqual([{ userId: ids.member }]);
  });

  it("stores and returns validated user preferences", async () => {
    await updateNotificationPreferences(execute, ids.owner, {
      inAppEnabled: true,
      strongMatchesEnabled: false,
      referralRequestsEnabled: true,
      applicationRemindersEnabled: false,
      jobActivityEnabled: true,
      groupActivityEnabled: false,
      digestCadence: "daily",
    });

    await expect(
      getNotificationPreferences(execute, ids.owner),
    ).resolves.toEqual({
      inAppEnabled: true,
      strongMatchesEnabled: false,
      referralRequestsEnabled: true,
      applicationRemindersEnabled: false,
      jobActivityEnabled: true,
      groupActivityEnabled: false,
      digestCadence: "daily",
    });
  });

  it("creates canonical activity but suppresses disabled notifications", async () => {
    await updateNotificationPreferences(execute, ids.owner, {
      inAppEnabled: false,
      strongMatchesEnabled: true,
      referralRequestsEnabled: true,
      applicationRemindersEnabled: true,
      jobActivityEnabled: true,
      groupActivityEnabled: true,
      digestCadence: "weekly",
    });

    await createDueFollowUpNotifications(
      execute,
      ids.owner,
      new Date("2026-09-04T12:00:00Z"),
    );
    const events = await client.query<{ count: number }>(
      "select count(*)::int as count from activity_events",
    );
    expect(events.rows[0]?.count).toBe(1);
    await expect(listNotifications(execute, ids.owner)).resolves.toEqual([]);
  });

  it("creates a single closing-soon notification for an aging saved job", async () => {
    const now = new Date("2026-09-04T12:00:00Z");

    await expect(
      createClosingSoonNotifications(execute, ids.owner, now),
    ).resolves.toBe(1);
    await expect(
      createClosingSoonNotifications(execute, ids.owner, now),
    ).resolves.toBe(0);

    const notifications = await listNotifications(execute, ids.owner);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      type: "job_likely_closing_soon",
      title: "Saved job may close soon",
    });
  });

  it("keeps another member's private application and activity out of the digest", async () => {
    await emitActivityEvent(execute, {
      groupId: ids.group,
      actorUserId: ids.member,
      recipientUserId: ids.member,
      eventType: "application_follow_up_reminder",
      entityType: "application",
      entityId: ids.memberApplication,
      visibility: "private",
      category: "application_reminders",
      recipientIds: [ids.member],
      title: "Private reminder",
      body: "MEMBER PRIVATE NOTIFICATION",
      actionUrl: "/app/groups/notification-jobs/tracker",
      dedupeKey: "private:member:reminder",
      summary: "MEMBER PRIVATE ACTIVITY",
    });
    await emitActivityEvent(execute, {
      groupId: ids.group,
      actorUserId: ids.member,
      recipientUserId: null,
      eventType: "job_shared",
      entityType: "job_share",
      entityId: null,
      visibility: "group",
      category: null,
      recipientIds: [],
      title: "Job shared",
      body: "A job was shared.",
      actionUrl: null,
      dedupeKey: "group:job:shared",
      summary: "A useful job was shared.",
    });

    // Keep event timestamps inside the injected digest clock, not wall-clock time.
    await client.query(
      "update activity_events set created_at = '2026-09-04T11:00:00Z' where group_id = $1",
      [ids.group],
    );
    const digest = await getRecipientGroupDigest(execute, {
      groupId: ids.group,
      userId: ids.owner,
      cadence: "weekly",
      now: new Date("2026-09-04T12:00:00Z"),
    });
    const serialized = JSON.stringify(digest);

    expect(digest?.jobsShared).toBe(2);
    expect(digest?.strongMatches[0]?.id).toBe(ids.job);
    expect(digest?.referralOpportunities[0]?.id).toBe(ids.job);
    expect(digest?.savedJobsNeedingAction[0]?.id).toBe(ids.savedJob);
    expect(digest?.contributionHighlights[0]?.summary).toBe(
      "A useful job was shared.",
    );
    expect(serialized).not.toContain("MEMBER PRIVATE");
    expect(serialized).not.toContain("OWNER PRIVATE");
    expect(serialized).not.toContain("PRIVATE REFERRAL MESSAGE");
    expect(digest).not.toHaveProperty("profilePreferences");
    expect(digest).not.toHaveProperty("applications");
  });
});
