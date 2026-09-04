import type {
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
  referralRequestStateEvents,
  referralRequests,
  reputationEvents,
  userJobStates,
  userReputationSummaries,
  users,
} from "@/server/db/schema";

type Insert<T extends { $inferInsert: unknown }> = T["$inferInsert"];

const baseDate = new Date("2026-08-01T09:00:00.000Z");

function demoId(scope: number, index: number) {
  const suffix = String(scope * 100 + index).padStart(12, "0");
  return `00000000-0000-4000-8000-${suffix}`;
}

const userIds = Array.from({ length: 8 }, (_, index) => demoId(1, index + 1));
const jobIds = Array.from({ length: 15 }, (_, index) => demoId(3, index + 1));
const groupId = demoId(2, 1);

const people = [
  {
    name: "Asha Raman",
    role: "Senior Product Designer",
    company: "Northstar Labs",
    location: "Bengaluru",
    years: 8,
    skills: ["Product Design", "Design Systems", "Research"],
  },
  {
    name: "Mateo Silva",
    role: "Frontend Engineer",
    company: "Paper Kite",
    location: "Lisbon",
    years: 6,
    skills: ["TypeScript", "React", "Accessibility"],
  },
  {
    name: "Priya Nair",
    role: "Product Manager",
    company: "Brightloop",
    location: "Mumbai",
    years: 7,
    skills: ["Product Strategy", "Analytics", "Growth"],
  },
  {
    name: "Jordan Kim",
    role: "Data Analyst",
    company: "Atlas Grove",
    location: "Singapore",
    years: 4,
    skills: ["SQL", "Python", "Experimentation"],
  },
  {
    name: "Leila Haddad",
    role: "Talent Partner",
    company: "Kinetic Harbor",
    location: "Dubai",
    years: 9,
    skills: ["Recruiting", "Career Coaching", "Operations"],
  },
  {
    name: "Noah Brooks",
    role: "Backend Engineer",
    company: "Lumen Works",
    location: "London",
    years: 5,
    skills: ["PostgreSQL", "Node.js", "Distributed Systems"],
  },
  {
    name: "Emi Tanaka",
    role: "UX Researcher",
    company: "Pebble Cloud",
    location: "Tokyo",
    years: 6,
    skills: ["User Research", "Service Design", "Facilitation"],
  },
  {
    name: "Dev Malik",
    role: "Machine Learning Engineer",
    company: "Common Thread",
    location: "Delhi",
    years: 5,
    skills: ["Machine Learning", "Python", "NLP"],
  },
] as const;

export const seedUsers = people.map((person, index) => ({
  id: userIds[index]!,
  name: person.name,
  email: `demo.person${index + 1}@example.test`,
  emailVerified: true,
  createdAt: baseDate,
  updatedAt: baseDate,
})) satisfies Insert<typeof users>[];

export const seedProfiles = people.map((person, index) => ({
  userId: userIds[index]!,
  displayName: person.name,
  headline: `${person.role} focused on useful, humane products`,
  currentRole: person.role,
  currentCompany: person.company,
  yearsExperience: person.years,
  location: person.location,
  skills: [...person.skills],
  profileCompleteness: 90,
  visibility: "groups" as const,
  privacySettings: {
    showCurrentCompany: true,
    showLocation: true,
    showSkills: true,
    showYearsExperience: true,
  },
  createdAt: baseDate,
  updatedAt: baseDate,
})) satisfies Insert<typeof profiles>[];

export const seedProfilePreferences = people.map((person, index) => ({
  userId: userIds[index]!,
  desiredRoles: [person.role, `Lead ${person.role}`],
  preferredLocations: [person.location, "Remote"],
  remotePreference: index % 2 === 0 ? ("hybrid" as const) : ("remote" as const),
  resumeUrl: `https://profiles.example.test/demo-person-${index + 1}/resume`,
  privateNotes: "Open to thoughtful product teams with clear growth paths.",
  createdAt: baseDate,
  updatedAt: baseDate,
})) satisfies Insert<typeof profilePreferences>[];

export const seedGroups = [
  {
    id: groupId,
    name: "Fictional Product Careers",
    slug: "fictional-product-careers",
    engineKey: "jobs" as const,
    ownerId: userIds[0]!,
    settings: {
      allowMemberInvites: true,
      defaultProfileVisibility: "members" as const,
    },
    createdAt: baseDate,
    updatedAt: baseDate,
  },
] satisfies Insert<typeof groups>[];

export const seedMemberships = userIds.map((userId, index) => ({
  id: demoId(21, index + 1),
  groupId,
  userId,
  role:
    index === 0
      ? ("owner" as const)
      : index === 1
        ? ("admin" as const)
        : ("member" as const),
  status: "active" as const,
  joinedAt: new Date(baseDate.getTime() + index * 86_400_000),
  updatedAt: baseDate,
})) satisfies Insert<typeof groupMemberships>[];

export const seedInvites = [
  {
    id: demoId(22, 1),
    groupId,
    inviterId: userIds[0]!,
    tokenHash: "fictional_sha256_hash_for_demo_invite_only",
    expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    maxUses: 25,
    useCount: 8,
    createdAt: baseDate,
  },
] satisfies Insert<typeof groupInvites>[];

const jobDefinitions = [
  [
    "Northstar Labs",
    "Senior Product Designer",
    "Bengaluru",
    "hybrid",
    ["Product Design", "Design Systems", "Research"],
  ],
  [
    "Paper Kite",
    "Frontend Engineer",
    "Remote - Europe",
    "remote",
    ["TypeScript", "React", "Accessibility"],
  ],
  [
    "Brightloop",
    "Product Manager, Growth",
    "Mumbai",
    "hybrid",
    ["Product Strategy", "Analytics", "Growth"],
  ],
  [
    "Atlas Grove",
    "Data Analyst",
    "Singapore",
    "onsite",
    ["SQL", "Python", "Experimentation"],
  ],
  [
    "Kinetic Harbor",
    "Talent Operations Lead",
    "Dubai",
    "hybrid",
    ["Recruiting", "Operations", "Coaching"],
  ],
  [
    "Lumen Works",
    "Backend Engineer",
    "London",
    "hybrid",
    ["PostgreSQL", "Node.js", "APIs"],
  ],
  [
    "Pebble Cloud",
    "Senior UX Researcher",
    "Tokyo",
    "hybrid",
    ["User Research", "Service Design", "Facilitation"],
  ],
  [
    "Common Thread",
    "Machine Learning Engineer",
    "Delhi",
    "hybrid",
    ["Python", "NLP", "Machine Learning"],
  ],
  [
    "Orbit Foundry",
    "Design Systems Engineer",
    "Remote - APAC",
    "remote",
    ["React", "Design Systems", "Accessibility"],
  ],
  [
    "Daybreak Systems",
    "Technical Program Manager",
    "Pune",
    "hybrid",
    ["Program Management", "Delivery", "APIs"],
  ],
  [
    "Marigold AI",
    "Applied AI Product Designer",
    "Remote",
    "remote",
    ["Product Design", "AI", "Prototyping"],
  ],
  [
    "Signal House",
    "Product Marketing Manager",
    "Bengaluru",
    "onsite",
    ["Positioning", "Research", "Go-to-market"],
  ],
  [
    "Cedar Studio",
    "Content Designer",
    "Remote - India",
    "remote",
    ["Content Design", "UX Writing", "Research"],
  ],
  [
    "Monsoon Works",
    "Platform Reliability Engineer",
    "Hyderabad",
    "hybrid",
    ["Kubernetes", "Observability", "PostgreSQL"],
  ],
  [
    "Lantern Health",
    "Product Analyst",
    "Chennai",
    "hybrid",
    ["SQL", "Analytics", "Healthcare"],
  ],
] as const;

export const seedJobs = jobDefinitions.map(
  ([company, title, location, workMode, skills], index) => ({
    id: jobIds[index]!,
    canonicalUrl: `https://careers.example.test/jobs/fictional-${index + 1}`,
    company,
    title,
    descriptionSummary: `${company} is looking for a ${title} to join a collaborative product team. This is fictional demonstration data.`,
    descriptionText: `This fictional role focuses on ${skills.join(", ")}. Candidates will work with a cross-functional team on clearly scoped product outcomes.`,
    location,
    workMode,
    employmentType: "full_time" as const,
    experienceMin: index % 3 === 0 ? 5 : 3,
    experienceMax: index % 3 === 0 ? 10 : 7,
    skills: [...skills],
    salaryText: index % 2 === 0 ? "Competitive fictional range" : null,
    postedAt: new Date(baseDate.getTime() + index * 3_600_000),
    source: "fictional_seed",
    status: "active" as const,
    createdAt: baseDate,
    updatedAt: baseDate,
  }),
) satisfies Insert<typeof jobs>[];

export const seedJobShares = seedJobs.map((job, index) => ({
  id: demoId(4, index + 1),
  groupId,
  jobId: job.id!,
  sharerId: userIds[index % userIds.length]!,
  note:
    index % 3 === 0
      ? "The team is open to thoughtful portfolio backgrounds."
      : null,
  sharedAt: new Date(baseDate.getTime() + index * 7_200_000),
})) satisfies Insert<typeof jobShares>[];

export const seedUserJobStates = [
  {
    userId: userIds[1]!,
    jobId: jobIds[0]!,
    seen: true,
    saved: true,
    savedAt: baseDate,
  },
  {
    userId: userIds[2]!,
    jobId: jobIds[2]!,
    seen: true,
    saved: true,
    savedAt: baseDate,
  },
  {
    userId: userIds[3]!,
    jobId: jobIds[3]!,
    seen: true,
    dismissed: true,
    dismissedAt: baseDate,
  },
  {
    userId: userIds[6]!,
    jobId: jobIds[6]!,
    seen: true,
    saved: true,
    savedAt: baseDate,
  },
] satisfies Insert<typeof userJobStates>[];

export const seedApplications = [
  {
    id: demoId(5, 1),
    userId: userIds[1]!,
    jobId: jobIds[1]!,
    sourceGroupId: groupId,
    status: "interviewing" as const,
    visibility: "private" as const,
    appliedAt: baseDate,
  },
  {
    id: demoId(5, 2),
    userId: userIds[2]!,
    jobId: jobIds[2]!,
    sourceGroupId: groupId,
    status: "applied" as const,
    visibility: "referrers" as const,
    appliedAt: baseDate,
  },
  {
    id: demoId(5, 3),
    userId: userIds[6]!,
    jobId: jobIds[6]!,
    sourceGroupId: groupId,
    status: "offer" as const,
    visibility: "private" as const,
    appliedAt: baseDate,
  },
  {
    id: demoId(5, 4),
    userId: userIds[3]!,
    jobId: jobIds[14]!,
    sourceGroupId: groupId,
    status: "saved" as const,
    visibility: "private" as const,
  },
] satisfies Insert<typeof applications>[];

export const seedApplicationEvents = seedApplications.flatMap(
  (application, index) => {
    const applied = {
      id: demoId(51, index * 2 + 1),
      applicationId: application.id!,
      fromStatus: null,
      toStatus:
        application.status === "saved"
          ? ("saved" as const)
          : ("applied" as const),
      changedByUserId: application.userId,
      createdAt: baseDate,
    } satisfies Insert<typeof applicationStatusEvents>;

    if (application.status === "applied" || application.status === "saved")
      return [applied];

    return [
      applied,
      {
        id: demoId(51, index * 2 + 2),
        applicationId: application.id!,
        fromStatus: "applied" as const,
        toStatus: application.status,
        changedByUserId: application.userId,
        createdAt: new Date(baseDate.getTime() + 86_400_000),
      },
    ];
  },
) satisfies Insert<typeof applicationStatusEvents>[];

export const seedReferrals = [
  {
    id: demoId(6, 1),
    requesterId: userIds[1]!,
    potentialReferrerId: userIds[0]!,
    jobId: jobIds[0]!,
    groupId,
    message:
      "Would you be comfortable referring me after reviewing my portfolio?",
    state: "accepted" as const,
    respondedAt: baseDate,
  },
  {
    id: demoId(6, 2),
    requesterId: userIds[2]!,
    potentialReferrerId: userIds[4]!,
    jobId: jobIds[4]!,
    groupId,
    message:
      "Could we discuss whether my operations background fits this role?",
    state: "requested" as const,
  },
  {
    id: demoId(6, 3),
    requesterId: userIds[6]!,
    potentialReferrerId: userIds[3]!,
    jobId: jobIds[3]!,
    groupId,
    message: "Would you share what the analytics interview usually emphasizes?",
    state: "referred" as const,
    respondedAt: baseDate,
    completedAt: baseDate,
  },
] satisfies Insert<typeof referralRequests>[];

export const seedReferralEvents = seedReferrals.flatMap((request, index) => {
  const initial = {
    id: demoId(52, index * 2 + 1),
    requestId: request.id!,
    fromState: null,
    toState: "requested" as const,
    changedByUserId: request.requesterId,
    createdAt: baseDate,
  };

  if (request.state === "requested") return [initial];

  return [
    initial,
    {
      id: demoId(52, index * 2 + 2),
      requestId: request.id!,
      fromState: "requested" as const,
      toState: request.state,
      changedByUserId: request.potentialReferrerId,
      createdAt: new Date(baseDate.getTime() + 3_600_000),
    },
  ];
}) satisfies Insert<typeof referralRequestStateEvents>[];

export const seedThreads = [
  {
    id: demoId(7, 1),
    groupId,
    kind: "general" as const,
    title: "Group chat",
    createdByUserId: userIds[0]!,
    createdAt: baseDate,
    updatedAt: baseDate,
  },
  {
    id: demoId(7, 2),
    groupId,
    jobId: jobIds[0]!,
    kind: "job" as const,
    title: "Senior Product Designer discussion",
    createdByUserId: userIds[0]!,
    createdAt: baseDate,
    updatedAt: baseDate,
  },
  {
    id: demoId(7, 3),
    groupId,
    jobId: jobIds[6]!,
    kind: "job" as const,
    title: "Senior UX Researcher discussion",
    createdByUserId: userIds[6]!,
    createdAt: baseDate,
    updatedAt: baseDate,
  },
] satisfies Insert<typeof messageThreads>[];

export const seedMessages = [
  {
    id: demoId(71, 1),
    groupId,
    threadId: demoId(7, 1),
    authorId: userIds[0]!,
    body: "Welcome. Share roles with enough context to help someone act.",
    createdAt: baseDate,
  },
  {
    id: demoId(71, 2),
    groupId,
    threadId: demoId(7, 1),
    authorId: userIds[4]!,
    body: "I can help with interview preparation this week.",
    createdAt: baseDate,
  },
  {
    id: demoId(71, 3),
    groupId,
    threadId: demoId(7, 2),
    authorId: userIds[1]!,
    body: "Does this team expect a systems-heavy portfolio?",
    createdAt: baseDate,
  },
  {
    id: demoId(71, 4),
    groupId,
    threadId: demoId(7, 2),
    authorId: userIds[0]!,
    replyToId: demoId(71, 3),
    body: "Yes, but one strong end-to-end case study should be enough.",
    createdAt: baseDate,
  },
  {
    id: demoId(71, 5),
    groupId,
    threadId: demoId(7, 3),
    authorId: userIds[6]!,
    body: "The role seems strong for mixed-methods researchers.",
    createdAt: baseDate,
  },
] satisfies Insert<typeof messages>[];

export const seedReputationEvents = [
  {
    id: demoId(8, 1),
    groupId,
    recipientUserId: userIds[0]!,
    actorUserId: userIds[1]!,
    eventType: "job_saved_by_member" as const,
    sourceEntityType: "job_share",
    sourceEntityId: demoId(4, 1),
    points: 2,
  },
  {
    id: demoId(8, 2),
    groupId,
    recipientUserId: userIds[4]!,
    actorUserId: userIds[2]!,
    eventType: "interview_helped" as const,
    sourceEntityType: "outcome",
    sourceEntityId: demoId(9, 2),
    points: 4,
  },
  {
    id: demoId(8, 3),
    groupId,
    recipientUserId: userIds[3]!,
    actorUserId: userIds[6]!,
    eventType: "referral_completed" as const,
    sourceEntityType: "referral_request",
    sourceEntityId: demoId(6, 3),
    points: 5,
  },
  ...seedJobShares.slice(0, 5).map((share, index) => ({
    id: demoId(8, index + 4),
    groupId,
    recipientUserId: share.sharerId,
    actorUserId: null,
    eventType: "job_shared" as const,
    sourceEntityType: "job_share",
    sourceEntityId: share.id!,
    points: 1,
  })),
] satisfies Insert<typeof reputationEvents>[];

export const seedReputationSummaries = userIds.map((userId) => {
  const events = seedReputationEvents.filter(
    (event) => event.recipientUserId === userId,
  );
  const count = (eventType: string) =>
    events.filter((event) => event.eventType === eventType).length;

  return {
    groupId,
    userId,
    totalPoints: events.reduce((total, event) => total + event.points, 0),
    jobsShared: count("job_shared"),
    jobsSavedByMembers: count("job_saved_by_member"),
    applicationsAttributed: count("application_attributed"),
    referralsCompleted: count("referral_completed"),
    interviewsHelped: count("interview_helped"),
    hiresHelped: count("hire_helped"),
    calculatedAt: baseDate,
  };
}) satisfies Insert<typeof userReputationSummaries>[];

export const seedOutcomes = [
  {
    id: demoId(9, 1),
    groupId,
    jobId: jobIds[6]!,
    subjectUserId: userIds[6]!,
    sharedByUserId: userIds[6]!,
    referredByUserId: userIds[3]!,
    outcomeType: "offer" as const,
    visibility: "group" as const,
    consentGrantedAt: baseDate,
    sharedAt: baseDate,
  },
  {
    id: demoId(9, 2),
    groupId,
    jobId: jobIds[4]!,
    subjectUserId: userIds[2]!,
    sharedByUserId: userIds[2]!,
    referredByUserId: userIds[4]!,
    outcomeType: "interview" as const,
    visibility: "group" as const,
    consentGrantedAt: baseDate,
    sharedAt: baseDate,
  },
] satisfies Insert<typeof outcomes>[];

export const seedNotifications = [
  {
    id: demoId(10, 1),
    userId: userIds[1]!,
    groupId,
    type: "referral_request_updated",
    payload: { referralRequestId: demoId(6, 1) },
    createdAt: baseDate,
  },
  {
    id: demoId(10, 2),
    userId: userIds[6]!,
    groupId,
    type: "application_follow_up_reminder",
    payload: { applicationId: demoId(5, 3) },
    createdAt: baseDate,
  },
] satisfies Insert<typeof notifications>[];

export const seedActivityEvents = seedJobShares
  .slice(0, 4)
  .map((share, index) => ({
    id: demoId(11, index + 1),
    groupId,
    actorUserId: share.sharerId,
    eventType: "job_shared",
    entityType: "job_share",
    entityId: share.id,
    visibility: "group" as const,
    createdAt: share.sharedAt,
  })) satisfies Insert<typeof activityEvents>[];

export const seedAiUsageEvents = [
  {
    id: demoId(12, 1),
    userId: userIds[0]!,
    groupId,
    feature: "job_extraction",
    modelAlias: "seed-model-alias",
    promptTokens: 420,
    completionTokens: 180,
    estimatedCostUsd: "0.001200",
    requestId: "fictional-request-1",
    metadata: { storesPromptText: false },
    createdAt: baseDate,
  },
  {
    id: demoId(12, 2),
    userId: userIds[1]!,
    groupId,
    feature: "matching",
    modelAlias: "seed-model-alias",
    promptTokens: 260,
    completionTokens: 90,
    estimatedCostUsd: "0.000700",
    requestId: "fictional-request-2",
    metadata: { storesPromptText: false },
    createdAt: baseDate,
  },
] satisfies Insert<typeof aiUsageEvents>[];

export const seedData = {
  users: seedUsers,
  profiles: seedProfiles,
  profilePreferences: seedProfilePreferences,
  groups: seedGroups,
  memberships: seedMemberships,
  invites: seedInvites,
  jobs: seedJobs,
  jobShares: seedJobShares,
  userJobStates: seedUserJobStates,
  applications: seedApplications,
  applicationEvents: seedApplicationEvents,
  referrals: seedReferrals,
  referralEvents: seedReferralEvents,
  threads: seedThreads,
  messages: seedMessages,
  reputationEvents: seedReputationEvents,
  reputationSummaries: seedReputationSummaries,
  outcomes: seedOutcomes,
  notifications: seedNotifications,
  activityEvents: seedActivityEvents,
  aiUsageEvents: seedAiUsageEvents,
} as const;

export { groupId, jobIds, userIds };
