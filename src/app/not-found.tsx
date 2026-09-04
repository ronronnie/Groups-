import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-shell py-section">
      <section className="w-full max-w-xl border-l-4 border-brand bg-surface-subtle p-5 sm:p-8">
        <SearchX aria-hidden="true" className="size-8 text-brand" />
        <p className="mt-5 font-secondary text-sm font-bold uppercase text-brand">
          Page not found
        </p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
          This page is not here.
        </h1>
        <p className="mt-3 font-secondary leading-7 text-muted-foreground">
          The link may be old, incomplete, or no longer available to you.
        </p>
        <Button asChild className="mt-6" variant="brand">
          <Link href="/app">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to your groups
          </Link>
        </Button>
      </section>
    </main>
  );
}
