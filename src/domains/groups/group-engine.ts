export type GroupEngineId = "jobs-referrals";

export type GroupEngineNavigationItem = {
  id: string;
  label: string;
  hrefSegment: string;
};

export type GroupEngineDefinition = {
  id: GroupEngineId;
  name: string;
  domainObjects: readonly string[];
  navigation: readonly GroupEngineNavigationItem[];
};
