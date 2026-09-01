"use server";

import { redirect } from "next/navigation";
import {
  careerProfileInputSchema,
  parseCommaSeparatedList,
} from "@/domains/profiles/career-profile";
import { requireCurrentUser } from "@/server/auth/current-user";
import { createProfileSqlExecutor } from "@/server/profiles/database";
import { saveCareerProfile } from "@/server/profiles/service";

export type CareerProfileActionState = {
  error: string | null;
};

function isChecked(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

export async function saveCareerProfileAction(
  _previousState: CareerProfileActionState,
  formData: FormData,
): Promise<CareerProfileActionState> {
  const user = await requireCurrentUser("/app/profile/setup");
  const parsed = careerProfileInputSchema.safeParse({
    displayName: formData.get("displayName"),
    headline: formData.get("headline"),
    currentRole: formData.get("currentRole"),
    currentCompany: formData.get("currentCompany"),
    yearsExperience: formData.get("yearsExperience"),
    location: formData.get("location"),
    skills: parseCommaSeparatedList(formData.get("skills")),
    desiredRoles: parseCommaSeparatedList(formData.get("desiredRoles")),
    preferredLocations: parseCommaSeparatedList(
      formData.get("preferredLocations"),
    ),
    remotePreference: formData.get("remotePreference"),
    resumeUrl: formData.get("resumeUrl"),
    portfolioUrl: formData.get("portfolioUrl"),
    linkedinUrl: formData.get("linkedinUrl"),
    websiteUrl: formData.get("websiteUrl"),
    privateNotes: formData.get("privateNotes"),
    visibility: formData.get("visibility"),
    privacySettings: {
      showCurrentCompany: isChecked(formData, "showCurrentCompany"),
      showLocation: isChecked(formData, "showLocation"),
      showSkills: isChecked(formData, "showSkills"),
      showYearsExperience: isChecked(formData, "showYearsExperience"),
    },
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check your profile details.",
    };
  }

  try {
    await saveCareerProfile(createProfileSqlExecutor(), user.id, parsed.data);
  } catch {
    return { error: "Your profile could not be saved. Please try again." };
  }

  redirect("/app/profile?saved=1");
}
