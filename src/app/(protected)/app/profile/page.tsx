import { CheckCircle2, LockKeyhole, Pencil } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CareerProfileSummary } from "@/features/profiles/components/career-profile-summary";
import { ProfileCompleteness } from "@/features/profiles/components/profile-completeness";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createProfileSqlExecutor } from "@/server/profiles/database";
import { getOwnerCareerProfile } from "@/server/profiles/service";

const visibilityLabels = {
  private: "Only me",
  groups: "My groups",
  public: "Anyone signed in",
} as const;

export default async function CareerProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireCurrentUser("/app/profile");
  const [profile, query] = await Promise.all([
    getOwnerCareerProfile(createProfileSqlExecutor(), user.id),
    searchParams,
  ]);

  if (!profile) {
    redirect("/app/profile/setup");
  }

  if (profile.completeness < 100) {
    redirect("/app/profile/setup");
  }

  return (
    <main className="mx-auto max-w-4xl px-shell py-section">
      <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <div className="max-w-2xl space-y-2">
          <p className="font-secondary text-sm font-bold uppercase text-brand">
            Your career profile
          </p>
          <h1 className="text-3xl font-bold sm:text-5xl">
            One profile. Every group.
          </h1>
          <p className="font-secondary leading-7 text-muted-foreground">
            This public summary is reusable. Your matching preferences remain
            private.
          </p>
        </div>
        <Button asChild variant="brand">
          <Link href="/app/profile/edit">
            <Pencil aria-hidden="true" className="size-4" />
            Edit profile
          </Link>
        </Button>
      </div>

      {query.saved === "1" ? (
        <p
          className="mt-7 flex items-center gap-2 border-l-4 border-success bg-success/10 p-4 font-secondary text-sm"
          role="status"
        >
          <CheckCircle2 aria-hidden="true" className="size-5 text-success" />
          Your profile is up to date.
        </p>
      ) : null}

      <ProfileCompleteness className="mt-8" value={profile.completeness} />
      <CareerProfileSummary profile={profile} />

      <section
        className="mt-10 border-t pt-7"
        aria-labelledby="privacy-summary"
      >
        <div className="flex items-start gap-3">
          <LockKeyhole aria-hidden="true" className="mt-1 size-5 shrink-0" />
          <div>
            <h2 className="text-xl font-bold" id="privacy-summary">
              Privacy controls
            </h2>
            <p className="mt-1 font-secondary text-sm leading-6 text-muted-foreground">
              Profile visibility: {visibilityLabels[profile.visibility]}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {profile.privacySettings.showCurrentCompany ? (
            <StatusBadge>Company visible</StatusBadge>
          ) : null}
          {profile.privacySettings.showYearsExperience ? (
            <StatusBadge>Experience visible</StatusBadge>
          ) : null}
          {profile.privacySettings.showLocation ? (
            <StatusBadge>Location visible</StatusBadge>
          ) : null}
          {profile.privacySettings.showSkills ? (
            <StatusBadge>Skills visible</StatusBadge>
          ) : null}
        </div>
        <p className="mt-5 max-w-2xl border-l-4 border-brand bg-surface-subtle p-4 font-secondary text-sm leading-6">
          Desired roles, preferred locations, work preference, resume, and
          matching notes are private and never included in member profile
          responses.
        </p>
      </section>
    </main>
  );
}
