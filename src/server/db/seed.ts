import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  activityEvents,
  aiUsageEvents,
  applicationStatusEvents,
  applications,
  groupInvites,
  groupMemberships,
  groups,
  jobShares,
  jobs,
  messageThreads,
  messages,
  notifications,
  outcomes,
  profilePreferences,
  profiles,
  referralRequests,
  reputationEvents,
  userJobStates,
  userReputationSummaries,
  users,
} from "@/server/db/schema";
import { seedData } from "@/server/db/seed-data";

async function seedDatabase(databaseUrl: string) {
  const client = neon(databaseUrl);
  const db = drizzle({ client });

  await db.insert(users).values(seedData.users).onConflictDoNothing();
  await db.insert(profiles).values(seedData.profiles).onConflictDoNothing();
  await db
    .insert(profilePreferences)
    .values(seedData.profilePreferences)
    .onConflictDoNothing();
  await db.insert(groups).values(seedData.groups).onConflictDoNothing();
  await db
    .insert(groupMemberships)
    .values(seedData.memberships)
    .onConflictDoNothing();
  await db.insert(groupInvites).values(seedData.invites).onConflictDoNothing();
  await db.insert(jobs).values(seedData.jobs).onConflictDoNothing();
  await db.insert(jobShares).values(seedData.jobShares).onConflictDoNothing();
  await db
    .insert(userJobStates)
    .values(seedData.userJobStates)
    .onConflictDoNothing();
  await db
    .insert(applications)
    .values(seedData.applications)
    .onConflictDoNothing();
  await db
    .insert(applicationStatusEvents)
    .values(seedData.applicationEvents)
    .onConflictDoNothing();
  await db
    .insert(referralRequests)
    .values(seedData.referrals)
    .onConflictDoNothing();
  await db
    .insert(messageThreads)
    .values(seedData.threads)
    .onConflictDoNothing();
  await db.insert(messages).values(seedData.messages).onConflictDoNothing();
  await db
    .insert(reputationEvents)
    .values(seedData.reputationEvents)
    .onConflictDoNothing();
  await db
    .insert(userReputationSummaries)
    .values(seedData.reputationSummaries)
    .onConflictDoNothing();
  await db.insert(outcomes).values(seedData.outcomes).onConflictDoNothing();
  await db
    .insert(notifications)
    .values(seedData.notifications)
    .onConflictDoNothing();
  await db
    .insert(activityEvents)
    .values(seedData.activityEvents)
    .onConflictDoNothing();
  await db
    .insert(aiUsageEvents)
    .values(seedData.aiUsageEvents)
    .onConflictDoNothing();

  return {
    jobs: seedData.jobs.length,
    people: seedData.users.length,
    groups: seedData.groups.length,
  };
}

export { seedDatabase };
