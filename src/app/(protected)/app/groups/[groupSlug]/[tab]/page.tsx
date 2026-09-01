import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/ui/badge";
import { getGroupEngine } from "@/domains/groups/registry";

export default async function GroupTabPage({
  params,
}: {
  params: Promise<{ groupSlug: string; tab: string }>;
}) {
  const { tab } = await params;
  const engine = getGroupEngine("jobs");
  const navigationTab = engine?.navigation.find(
    (item) => item.hrefSegment === tab,
  );
  const emptyState = engine?.emptyStates.find((item) => item.id === tab);

  if (!engine || !navigationTab || !emptyState) {
    notFound();
  }

  return (
    <div className="max-w-3xl">
      <div className="space-y-2">
        {tab === "for-you" ? (
          <StatusBadge tone="warning">Career profile comes next</StatusBadge>
        ) : null}
        <h2 className="text-4xl font-bold">{navigationTab.label}</h2>
      </div>
      <section className="mt-10 border-t pt-8">
        <h3 className="text-2xl font-bold">{emptyState.title}</h3>
        <p className="mt-2 max-w-xl font-secondary leading-7 text-muted-foreground">
          {emptyState.description}
        </p>
      </section>
    </div>
  );
}
