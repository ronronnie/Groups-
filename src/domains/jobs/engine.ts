import type { GroupEngine } from "@/domains/groups/group-engine";

export const jobsReferralsEngine = {
  key: "jobs",
  displayName: "Jobs & Referrals",
  description:
    "Share opportunities, discover relevant roles, track applications, and request referrals together.",
  navigation: [
    { id: "for-you", label: "For You", hrefSegment: "for-you" },
    { id: "jobs", label: "Jobs", hrefSegment: "jobs" },
    { id: "tracker", label: "Tracker", hrefSegment: "tracker" },
    { id: "people", label: "People", hrefSegment: "people" },
    { id: "chat", label: "Chat", hrefSegment: "chat" },
  ],
  supportedObjectTypes: [
    "job",
    "job-share",
    "application",
    "referral-request",
    "career-profile",
    "job-discussion",
    "chat-message",
    "reputation-event",
    "outcome",
  ],
  supportedActions: [
    "share-job",
    "save-job",
    "track-application",
    "request-referral",
    "discuss-job",
    "send-chat-message",
    "search-group",
  ],
  policyIdentifiers: [
    "group:view",
    "group:manage",
    "job:share",
    "application:manage-own",
    "referral:request",
    "discussion:participate",
    "chat:participate",
  ],
  aiCapabilityIdentifiers: [
    "job:extract",
    "job:match",
    "job:explain-match",
    "job:detect-duplicate",
    "group:search",
    "content:moderate",
    "group:summarize",
  ],
  emptyStates: [
    {
      id: "for-you",
      title: "Your matches will appear here",
      description:
        "Complete your career profile and shared jobs will be ranked for you.",
    },
    {
      id: "jobs",
      title: "No jobs shared yet",
      description: "Share the first job link with this group.",
      action: "share-job",
    },
    {
      id: "tracker",
      title: "No applications yet",
      description: "Track a job when you are ready to apply.",
      action: "track-application",
    },
    {
      id: "people",
      title: "Your group is ready for people",
      description:
        "Invite trusted people to share opportunities and referrals.",
    },
    {
      id: "chat",
      title: "Start the conversation",
      description:
        "Use chat for lightweight coordination around the group's purpose.",
      action: "send-chat-message",
    },
  ],
  onboardingRequirements: [
    {
      id: "group-membership",
      label: "Join the group",
      scope: "group",
      required: true,
    },
    {
      id: "career-profile",
      label: "Complete your reusable career profile",
      scope: "global",
      required: true,
    },
  ],
} as const satisfies GroupEngine;
