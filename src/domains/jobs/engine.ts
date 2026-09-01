import type { GroupEngineDefinition } from "@/domains/groups/group-engine";

export const jobsReferralsEngine = {
  id: "jobs-referrals",
  name: "Jobs & Referrals",
  domainObjects: [
    "group",
    "membership",
    "careerProfile",
    "job",
    "savedJob",
    "application",
    "referralRequest",
    "jobDiscussion",
    "chatMessage",
    "reputationEvent",
  ],
  navigation: [
    { id: "for-you", label: "For You", hrefSegment: "for-you" },
    { id: "jobs", label: "Jobs", hrefSegment: "jobs" },
    { id: "tracker", label: "Tracker", hrefSegment: "tracker" },
    { id: "people", label: "People", hrefSegment: "people" },
    { id: "chat", label: "Chat", hrefSegment: "chat" },
  ],
} as const satisfies GroupEngineDefinition;
