import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CareerProfileForm } from "@/features/profiles/components/career-profile-form";
import { ProfileCompleteness } from "@/features/profiles/components/profile-completeness";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createProfileSqlExecutor } from "@/server/profiles/database";
import { getOwnerCareerProfile } from "@/server/profiles/service";

export default async function EditCareerProfilePage() {
  const user = await requireCurrentUser("/app/profile/edit");
  const profile = await getOwnerCareerProfile(
    createProfileSqlExecutor(),
    user.id,
  );

  if (!profile) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-shell py-section">
      <Button asChild className="mb-8" variant="ghost">
        <Link href="/app/profile">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Profile
        </Link>
      </Button>
      <div className="mb-10 max-w-2xl space-y-3">
        <p className="font-secondary text-sm font-bold uppercase text-brand">
          Career profile
        </p>
        <h1 className="text-3xl font-bold sm:text-5xl">Keep it current.</h1>
        <p className="font-secondary leading-7 text-muted-foreground">
          Changes apply everywhere your career profile is used.
        </p>
        <ProfileCompleteness className="pt-3" value={profile.completeness} />
      </div>
      <CareerProfileForm profile={profile} />
    </main>
  );
}
