import {
  groupEngineKeySchema,
  type GroupEngine,
  type GroupEngineKey,
  type GroupEngineNavigationLink,
} from "@/domains/groups/group-engine";
import { jobsReferralsEngine } from "@/domains/jobs/engine";

export const groupEngineRegistry = Object.freeze({
  jobs: jobsReferralsEngine,
}) satisfies Readonly<Record<GroupEngineKey, GroupEngine>>;

export const enabledGroupEngineKeys = Object.freeze(
  Object.keys(groupEngineRegistry) as GroupEngineKey[],
);

export function getGroupEngine(engineKey: unknown): GroupEngine | null {
  const result = groupEngineKeySchema.safeParse(engineKey);

  return result.success ? groupEngineRegistry[result.data] : null;
}

export function createGroupEngineNavigation(
  engine: GroupEngine,
  groupBasePath: string,
): readonly GroupEngineNavigationLink[] {
  const normalizedBasePath = groupBasePath.replace(/\/+$/, "");

  return engine.navigation.map((tab) => ({
    ...tab,
    href: `${normalizedBasePath}/${tab.hrefSegment}`,
  }));
}

export function getGroupEngineNavigation(
  engineKey: unknown,
  groupBasePath: string,
): readonly GroupEngineNavigationLink[] {
  const engine = getGroupEngine(engineKey);

  return engine ? createGroupEngineNavigation(engine, groupBasePath) : [];
}
