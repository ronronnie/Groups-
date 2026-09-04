"use client";

import { ErrorState } from "@/components/ui/states";

export default function AppError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-4xl px-shell py-section">
      <ErrorState
        action={{ label: "Try again", onClick: reset }}
        description="We could not load this page. Your information has not been changed."
        title="Something went wrong"
      />
    </main>
  );
}
