import { z } from "zod";

export const groupEngineKeySchema = z.enum(["jobs"]);

export type GroupEngineKey = z.infer<typeof groupEngineKeySchema>;

export type GroupEngineNavigationTab = {
  id: string;
  label: string;
  hrefSegment: string;
};

export type GroupEngineObjectType =
  | "job"
  | "job-share"
  | "application"
  | "referral-request"
  | "career-profile"
  | "job-discussion"
  | "chat-message"
  | "reputation-event"
  | "outcome";

export type GroupEngineAction =
  | "share-job"
  | "save-job"
  | "track-application"
  | "request-referral"
  | "discuss-job"
  | "send-chat-message"
  | "search-group";

export type GroupEnginePolicy =
  | "group:view"
  | "group:manage"
  | "job:share"
  | "application:manage-own"
  | "referral:request"
  | "discussion:participate"
  | "chat:participate";

export type GroupEngineAiCapability =
  | "job:extract"
  | "job:match"
  | "job:explain-match"
  | "job:detect-duplicate"
  | "group:search"
  | "content:moderate"
  | "group:summarize";

export type GroupEngineEmptyState = {
  id: string;
  title: string;
  description: string;
  action?: GroupEngineAction;
};

export type GroupEngineOnboardingRequirement = {
  id: string;
  label: string;
  scope: "global" | "group";
  required: boolean;
};

export interface GroupEngine {
  key: GroupEngineKey;
  displayName: string;
  description: string;
  navigation: readonly GroupEngineNavigationTab[];
  supportedObjectTypes: readonly GroupEngineObjectType[];
  supportedActions: readonly GroupEngineAction[];
  policyIdentifiers: readonly GroupEnginePolicy[];
  aiCapabilityIdentifiers: readonly GroupEngineAiCapability[];
  emptyStates: readonly GroupEngineEmptyState[];
  onboardingRequirements: readonly GroupEngineOnboardingRequirement[];
}

export type GroupEngineNavigationLink = GroupEngineNavigationTab & {
  href: string;
};
