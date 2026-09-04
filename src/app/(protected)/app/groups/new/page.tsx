import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CreateGroupForm } from "@/features/groups/components/create-group-form";

export default function CreateGroupPage() {
  return (
    <main className="mx-auto max-w-3xl px-shell py-section">
      <Button asChild className="mb-8" variant="ghost">
        <Link href="/app">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Your groups
        </Link>
      </Button>
      <div className="mb-8 max-w-2xl space-y-2">
        <p className="font-secondary text-sm font-bold uppercase text-brand">
          Create a group
        </p>
        <h1 className="text-3xl font-bold sm:text-5xl">
          What brings you together?
        </h1>
        <p className="font-secondary leading-7 text-muted-foreground">
          Start with the purpose. Everything else is set up for you.
        </p>
      </div>
      <CreateGroupForm />
    </main>
  );
}
