import { redirect } from "next/navigation";
import { CareerProfileForm } from "@/features/profiles/components/career-profile-form";
import { ProfileCompleteness } from "@/features/profiles/components/profile-completeness";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createProfileSqlExecutor } from "@/server/profiles/database";
import { getOwnerCareerProfile } from "@/server/profiles/service";

export default async function CareerProfileSetupPage() {
  const user = await requireCurrentUser("/app/profile/setup");
  const profile = await getOwnerCareerProfile(
    createProfileSqlExecutor(),
    user.id,
  );

  if (!profile) {
    redirect("/app");
  }

  if (profile.completeness === 100) {
    redirect("/app/profile/edit");
  }

  return (
    <main className="mx-auto max-w-4xl px-shell py-section">
      <div className="mb-10 max-w-2xl space-y-3">
        <p className="font-secondary text-sm font-bold uppercase text-brand">
          One profile, every group
        </p>
        <h1 className="text-4xl font-bold sm:text-5xl">
          Tell us what work fits you.
        </h1>
        <p className="font-secondary leading-7 text-muted-foreground">
          Add your career details once. Groups can reuse the same summary while
          your matching preferences stay private.
        </p>
        <ProfileCompleteness className="pt-3" value={profile.completeness} />
      </div>
      <CareerProfileForm profile={profile} submitLabel="Complete profile" />
    </main>
  );
}
