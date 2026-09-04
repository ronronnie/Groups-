import { Button } from "@/components/ui/button";

export default function AccountSettingsPage() {
  return (
    <main className="mx-auto max-w-6xl px-shell py-section">
      <section className="max-w-2xl space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold sm:text-4xl">Account</h1>
          <p className="font-secondary text-muted-foreground">
            Manage security-sensitive account actions.
          </p>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-bold">Delete account</h2>
          <p className="mt-2 font-secondary text-sm leading-6 text-muted-foreground">
            Permanent deletion will require recent authentication and explicit
            confirmation.
          </p>
          <Button className="mt-4" disabled variant="destructive">
            Delete account
          </Button>
        </div>
      </section>
    </main>
  );
}
